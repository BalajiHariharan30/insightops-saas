import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';
import { config } from './index';
import { logger } from './logger';

if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  // Use production URL in prod, localhost in dev — no env var needed on Render
  const BACKEND_URL =
    config.NODE_ENV === 'production'
      ? 'https://insightops-backend-6ktc.onrender.com'
      : `http://localhost:${config.PORT}`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/api/v1/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0].value;
          if (!email) {
            return done(new Error('No email returned from Google OAuth'));
          }

          let user = await User.findOne({ email });

          if (user) {
            // Account Linking: User exists — link Google ID if not already linked
            if (!user.googleId) {
              user.googleId = profile.id;
              if (!user.isVerified) user.isVerified = true;
              await user.save();
              logger.info(`Linked Google account for user: ${email}`);
            }
          } else {
            // New user signup via Google
            user = new User({
              name: profile.displayName || profile.name?.givenName || 'Google User',
              email,
              googleId: profile.id,
              isVerified: true,
            });
            await user.save();

            // Auto-create default organization for new Google signup
            const orgSlug = `${user.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-org`;
            const org = new Organization({
              name: `${user.name}'s Organization`,
              slug: orgSlug,
            });
            await org.save();

            const member = new OrganizationMember({
              userId: user._id,
              organizationId: org._id,
              role: 'ADMIN',
              status: 'ACTIVE',
            });
            await member.save();
            logger.info(`Created new user & org via Google OAuth: ${email}`);
          }

          return done(null, user as any);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
  logger.info('✅ Google OAuth strategy registered successfully.');
} else {
  logger.warn('⚠️ Google OAuth is disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing.');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user as any);
  } catch (err) {
    done(err);
  }
});

export { passport };
export default passport;
