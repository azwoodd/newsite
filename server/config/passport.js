// server/config/passport.js
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');

module.exports = (passport) => {
  // JWT Strategy
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret_dev'
  };

  passport.use(
    new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
      try {
        // Find the user based on the id in the JWT payload
        const users = await query('SELECT id, name, email, role FROM users WHERE id = ?', [jwt_payload.id]);
        
        if (users.length > 0) {
          return done(null, users[0]);
        }
        
        return done(null, false);
      } catch (error) {
        console.error('Error in JWT authentication:', error);
        return done(error, false);
      }
    })
  );

  // Google Strategy - simplified for clarity and reliability
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from profile
          const email = profile.emails[0].value;
          const name = profile.displayName;
          
          // Check if user exists with this email
          const users = await query('SELECT * FROM users WHERE email = ?', [email]);
          
          if (users.length > 0) {
            // User exists, return user
            return done(null, users[0]);
          } else {
            // Create a new user
            const result = await query(
              'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
              [name, email, 'google-auth-user', 'user']
            );
            
            const newUser = {
              id: result.insertId,
              name,
              email,
              role: 'user'
            };
            
            return done(null, newUser);
          }
        } catch (error) {
          console.error('Error in Google authentication:', error);
          return done(error, false);
        }
      }
    )
  );
};