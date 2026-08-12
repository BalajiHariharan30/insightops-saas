import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, IUser } from '../users/user.model';
import { RefreshToken } from './refresh-token.model';
import { generateAccessToken } from './jwt.utils';
import { sendEmail } from '../../infrastructure/email/email.service';
import { ConflictError, AuthenticationError, NotFoundError, AppError } from '../../utils/errors';
import { Organization } from '../organizations/organization.model';
import { OrganizationMember } from '../organizations/member.model';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  tokens: AuthTokens;
}

export async function registerUser(name: string, email: string, password: string): Promise<IUser> {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('A user with this email address already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = new User({
    name,
    email,
    passwordHash,
    verificationToken,
    isVerified: false, // Default verification status
  });

  await user.save();

  // Create default organization for new signups to streamline onboarding UX
  const orgSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-org`;
  const org = new Organization({
    name: `${name}'s Organization`,
    slug: orgSlug,
  });
  await org.save();

  const member = new OrganizationMember({
    userId: user._id,
    organizationId: org._id,
    role: 'ADMIN', // First user is automatically ADMIN
    status: 'ACTIVE',
  });
  await member.save();

  // Send simulated verification email
  await sendEmail({
    to: email,
    subject: 'Verify your InsightOps Account',
    body: `Hello ${name},\n\nPlease verify your account by using token: ${verificationToken}\n\nThanks,\nInsightOps Team`,
  });

  return user;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new AuthenticationError('No account found with this email address. Please register first.');
  }

  // Account was created via Google OAuth - no password set
  if (!user.passwordHash) {
    if (user.googleId) {
      throw new AuthenticationError('This account uses Google Sign-In. Please click "Google Workspace" to log in.');
    }
    throw new AuthenticationError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AuthenticationError('Incorrect password. Please try again.');
  }

  const tokens = await generateAndSaveTokens(user._id.toString());

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    tokens,
  };
}

export async function rotateRefreshToken(token: string): Promise<AuthTokens> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenRecord = await RefreshToken.findOne({ tokenHash });

  if (!tokenRecord) {
    throw new AuthenticationError('Invalid refresh token');
  }

  // Refresh Token Reuse Detection
  if (tokenRecord.isRotated) {
    // Suspect breach: invalidate all sessions of this user
    await RefreshToken.deleteMany({ userId: tokenRecord.userId });
    throw new AuthenticationError('Refresh token reuse detected. All sessions revoked.');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new AuthenticationError('Refresh token expired');
  }

  // Mark token as rotated/used
  tokenRecord.isRotated = true;
  await tokenRecord.save();

  // Generate and return new tokens
  return generateAndSaveTokens(tokenRecord.userId.toString());
}

export async function logoutUser(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await RefreshToken.deleteOne({ tokenHash });
}

export async function logoutAllDevices(userId: string): Promise<void> {
  await RefreshToken.deleteMany({ userId });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) {
    // Prevent user enumeration by silently returning
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiry

  await user.save();

  await sendEmail({
    to: email,
    subject: 'InsightOps Password Reset Link',
    body: `Hello ${user.name},\n\nYou requested a password reset. Use token: ${resetToken} to reset your password. This token expires in 1 hour.\n\nThanks,\nInsightOps Team`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Password reset token is invalid or has expired', 'INVALID_RESET_TOKEN', 400);
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
}

// Utility to create, hash, and persist Refresh Tokens
async function generateAndSaveTokens(userId: string): Promise<AuthTokens> {
  const accessToken = generateAccessToken(userId);
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7); // Valid for 7 days

  await RefreshToken.create({
    tokenHash: refreshTokenHash,
    userId,
    expiresAt: expiry,
    isRotated: false,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

export async function loginGoogleUser(email: string): Promise<AuthResponse> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('Google authenticated user record not found in system database');
  }

  const tokens = await generateAndSaveTokens(user._id.toString());

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    tokens,
  };
}

