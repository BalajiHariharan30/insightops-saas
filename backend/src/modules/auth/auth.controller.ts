import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import * as orgService from '../organizations/organization.service';
import { User } from '../users/user.model';
import { config } from '../../config';

const COOKIE_NAME = 'jid';

const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching token expiry
  ...(config.NODE_ENV === 'production' ? { partitioned: true } : {}),
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;
    await authService.registerUser(name, email, password);
    
    // Auto-login after registration (new users never have MFA yet, cast is safe)
    const authData = await authService.loginUser(email, password) as authService.AuthResponse;
    res.cookie(COOKIE_NAME, authData.tokens.refreshToken, cookieOptions);

    return res.status(201).json({
      success: true,
      data: {
        user: authData.user,
        accessToken: authData.tokens.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const authData = await authService.loginUser(email, password);

    // If user has MFA enabled, return the challenge token — no full tokens yet
    if ('mfaRequired' in authData) {
      return res.status(200).json({
        success: true,
        data: {
          mfaRequired: true,
          mfaToken: authData.mfaToken,
          email: authData.email,
        },
      });
    }

    res.cookie(COOKIE_NAME, authData.tokens.refreshToken, cookieOptions);

    // Fetch user's organizations so frontend can set active_organization_id immediately
    const organizations = await orgService.listUserOrganizations(authData.user.id);

    return res.status(200).json({
      success: true,
      data: {
        user: authData.user,
        accessToken: authData.tokens.accessToken,
        organizations,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).select('-passwordHash -passwordResetToken -verificationToken');
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies[COOKIE_NAME] || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Refresh token is missing' } });
    }

    const tokens = await authService.rotateRefreshToken(token);
    res.cookie(COOKIE_NAME, tokens.refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (token) {
      await authService.logoutUser(token);
    }
    res.clearCookie(COOKIE_NAME, cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    return res.status(200).json({
      success: true,
      message: 'If the email matches an active account, a password reset link has been sent.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    return res.status(200).json({
      success: true,
      message: 'Password has been successfully updated.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function callbackGoogle(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.redirect(`${config.FRONTEND_URL}/auth?error=oauth_failed`);
    }

    const authData = await authService.loginGoogleUser(user.email);
    res.cookie(COOKIE_NAME, authData.tokens.refreshToken, cookieOptions);

    // Fetch orgs so frontend can set active_organization_id immediately
    const organizations = await orgService.listUserOrganizations(authData.user.id);
    const firstOrgId = organizations[0]?.organization?._id?.toString() || '';

    // Redirect to OAuthCallback page with accessToken + orgId
    return res.redirect(
      `${config.FRONTEND_URL}/oauth-callback?token=${authData.tokens.accessToken}&orgId=${firstOrgId}`
    );
  } catch (error) {
    return next(error);
  }
}

/** POST /auth/verify-otp — exchange mfaToken + OTP code for full auth tokens */
export async function verifyMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const { mfaToken, code } = req.body;
    if (!mfaToken || !code) {
      return res.status(400).json({ success: false, error: { message: 'mfaToken and code are required' } });
    }

    const authData = await authService.verifyMfaOtp(mfaToken, code);
    res.cookie(COOKIE_NAME, authData.tokens.refreshToken, cookieOptions);

    const organizations = await orgService.listUserOrganizations(authData.user.id);

    return res.status(200).json({
      success: true,
      data: {
        user: authData.user,
        accessToken: authData.tokens.accessToken,
        organizations,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/** PUT /auth/mfa — enable or disable MFA for the authenticated user */
export async function updateMfaSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') {
      return res.status(400).json({ success: false, error: { message: '"enable" must be a boolean' } });
    }
    await authService.toggleMfa(req.user!.id, enable);
    return res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enable ? 'enabled' : 'disabled'} successfully.`,
    });
  } catch (error) {
    return next(error);
  }
}
