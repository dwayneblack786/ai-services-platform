import dotenv from "dotenv";
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { User, UserRole } from '../../../shared/types';
import { getDB } from './database';
import { UserDocument } from '../models/User';
dotenv.config();

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();
// Only configure OAuth if credentials are provided
const hasOAuthCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasOAuthCredentials) {
  console.log('✓ Google OAuth configured');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: '/api/auth/google/callback'
      },
      (accessToken, refreshToken, profile, done) => {
        // Find or create user
        let user = users.get(profile.id);
        
        if (!user) {
          // Generate tenant for new OAuth user
          const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const now = new Date();
          
          user = {
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName,
            picture: profile.photos?.[0]?.value || '',
            role: UserRole.CLIENT, // Default role for OAuth users
            tenantId,
            emailVerified: true, // OAuth users are auto-verified
            companyDetailsCompleted: false,
            authProvider: 'google',
            createdAt: now,
            updatedAt: now
          };
          users.set(profile.id, user);
        }
        
        return done(null, user);
      }
    )
  );
} else {
  console.log('⚠ Google OAuth not configured (credentials missing)');
  console.log('  → Use dev-login endpoint for development');
}

// Local Strategy (Email/Password)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const db = getDB();
        
        // Find user by email in MongoDB
        const user = await db.collection<UserDocument>('users').findOne({ 
          email, 
          authProvider: 'local' 
        });

        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        // Check if email is verified
        if (!user.emailVerified) {
          return done(null, false, { message: 'Please verify your email before logging in' });
        }

        // Verify password
        if (!user.passwordHash) {
          return done(null, false, { message: 'Invalid authentication method' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        // Remove password hash before returning user
        const { passwordHash, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  )
);

console.log('✓ Local Strategy (Email/Password) configured');

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const db = getDB();
    const user = await db.collection<UserDocument>('users').findOne({ id });
    done(null, user || null);
  } catch (error) {
    done(error);
  }
});

export { users, hasOAuthCredentials };
