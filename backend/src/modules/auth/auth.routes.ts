import { Router } from 'express';
import passport from 'passport';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validation';
import * as authValidation from './auth.validation';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', validate(authValidation.registerSchema), authController.register);
router.post('/login', validate(authValidation.loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

// Password resets
router.post('/forgot-password', validate(authValidation.requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/reset-password', validate(authValidation.resetPasswordSchema), authController.resetPassword);

// MFA — OTP verification (public — uses short-lived mfaToken instead of auth header)
router.post('/verify-otp', authController.verifyMfa);
// MFA — Toggle on/off (protected — requires valid access token)
router.put('/mfa', authenticate, authController.updateMfaSettings);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), authController.callbackGoogle);

export default router;
