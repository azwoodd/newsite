// server/config/passport.js
const { Strategy: JwtStrategy } = require('passport-jwt');
const { ExtractJwt } = require('passport-jwt');
const { query } = require('./db');

// We can safely require this; we’ll only register it if env is present
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

module.exports = (passport) => {
  // ===== JWT Strategy (always on) =====
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret_dev',
  };

  passport.use(
    new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
      try {
        const users = await query(
          'SELECT id, name, email, role FROM users WHERE id = ?',
          [jwt_payload.id]
        );
        if (users.length > 0) return done(null, users[0]);
        return done(null, false);
      } catch (err) {
        console.error('Error in JWT authentication:', err);
        return done(err, false);
      }
    })
  );

  // ===== Google OAuth (optional) =====
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.BASE_URL || 'https://songsculptors.com'}/api/auth/google/callback`;

    try {
      passport.use(
        new GoogleStrategy(
          {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL,
            proxy: true,
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const email = profile.emails?.[0]?.value;
              const name = profile.displayName || 'Google User';

              if (!email) {
                // No email from Google (very rare, but possible if scope limited)
                return done(new Error('Google profile did not return an email'), false);
              }

              const users = await query('SELECT * FROM users WHERE email = ?', [email]);

              if (users.length > 0) {
                return done(null, users[0]);
              }

              const result = await query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, 'google-auth-user', 'user']
              );

              const newUser = { id: result.insertId, name, email, role: 'user' };
              return done(null, newUser);
            } catch (err) {
              console.error('Error in Google authentication:', err);
              return done(err, false);
            }
          }
        )
      );
      console.log('Google OAuth strategy configured.');
    } catch (err) {
      console.error('Failed to configure Google OAuth strategy:', err.message);
    }
  } else {
    console.warn(
      'Google OAuth is disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set. ' +
        'Login via Google will not be available.'
    );
  }
};