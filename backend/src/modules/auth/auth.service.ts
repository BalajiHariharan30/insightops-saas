import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../users/user.model';
import { RefreshToken } from './refresh-token.model';
import { OtpToken } from './otp-token.model';
import { generateAccessToken } from './jwt.utils';
import { sendEmail } from '../../infrastructure/email/email.service';
import { ConflictError, AuthenticationError, NotFoundError, AppError } from '../../utils/errors';
import { Organization } from '../organizations/organization.model';
import { OrganizationMember } from '../organizations/member.model';
import { config } from '../../config';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    mfaEnabled: boolean;
  };
  tokens: AuthTokens;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string; // short-lived JWT used to verify OTP — NOT an access token
  email: string;
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

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse | MfaRequiredResponse> {
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

  // If MFA is enabled for this user, issue a short-lived MFA challenge token
  // instead of full auth tokens. The client must verify the OTP before getting access.
  if (user.mfaEnabled) {
    // Generate and send OTP
    await sendMfaOtp(user._id.toString(), user.email, user.name);

    // Short-lived (10 min) token used only to authorize the /auth/verify-otp call
    const mfaToken = jwt.sign(
      { userId: user._id.toString(), purpose: 'mfa_challenge' },
      config.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return {
      mfaRequired: true,
      mfaToken,
      email: user.email,
    };
  }

  const tokens = await generateAndSaveTokens(user._id.toString());

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      mfaEnabled: user.mfaEnabled,
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
      mfaEnabled: user.mfaEnabled,
    },
    tokens,
  };
}

// ── MFA / OTP Functions ────────────────────────────────────────────────────

/** Generate a 6-digit OTP, hash it, store it, and email it to the user. */
export async function sendMfaOtp(
  userId: string,
  email: string,
  name: string
): Promise<void> {
  // Invalidate any existing unused OTPs for this user
  await OtpToken.deleteMany({ userId });

  // Generate cryptographically secure 6-digit code
  const code = String(crypto.randomInt(100000, 999999));
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  await OtpToken.create({
    userId,
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    used: false,
  });

  await sendEmail({
    to: email,
    subject: 'InsightOps — Your Verification Code',
    body: [
      `Hello ${name},`,
      '',
      'Your InsightOps two-factor authentication code is:',
      '',
      `  ${code}`,
      '',
      'This code expires in 10 minutes. Do not share it with anyone.',
      '',
      'If you did not attempt to sign in, please reset your password immediately.',
      '',
      'Thanks,',
      'InsightOps Security Team',
    ].join('\n'),
  });
}

/**
 * Verify an MFA OTP code using the mfaToken issued during login.
 * Returns full auth tokens on success.
 */
export async function verifyMfaOtp(
  mfaToken: string,
  code: string
): Promise<AuthResponse> {
  // Decode the short-lived mfa_challenge token
  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(mfaToken, config.JWT_SECRET) as any;
  } catch {
    throw new AuthenticationError('MFA session has expired. Please log in again.');
  }

  if (payload.purpose !== 'mfa_challenge') {
    throw new AuthenticationError('Invalid MFA token.');
  }

  const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');

  const otpRecord = await OtpToken.findOne({
    userId: payload.userId,
    codeHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new AuthenticationError('Invalid or expired verification code.');
  }

  // Mark as used immediately (single-use)
  otpRecord.used = true;
  await otpRecord.save();

  const user = await User.findById(payload.userId);
  if (!user) throw new NotFoundError('User not found');

  const tokens = await generateAndSaveTokens(user._id.toString());

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      mfaEnabled: user.mfaEnabled,
    },
    tokens,
  };
}

/** Enable or disable MFA for a user. */
export async function toggleMfa(
  userId: string,
  enable: boolean
): Promise<void> {
  await User.findByIdAndUpdate(userId, { mfaEnabled: enable });
}
