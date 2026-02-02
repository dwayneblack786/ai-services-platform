import passport from 'passport';
import User from '../models/User';

/**
 * Passport Configuration - MINIMAL (Keycloak handles auth)
 * 
 * Local Strategy and Google OAuth removed - all authentication through Keycloak.
 * Keeping only serialization/deserialization for session compatibility.
 */

passport.serializeUser((user: any, done) => {
  // Serialize using MongoDB _id (converted to string)
  const userId = user._id?.toString() || user.id;
  console.log('[Passport] Serializing user:', user.email, 'ID:', userId);
  done(null, userId);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    // console.log('[Passport] Deserializing user ID:', id);
    // Find by MongoDB _id
    const user = await User.findById(id).select('-passwordHash').lean();
    
    if (!user) {
      console.log('[Passport] User not found for ID:', id);
      return done(null, false);
    }
    
    // console.log('[Passport] User deserialized:', user.email);
    done(null, user);
  } catch (error) {
    console.error('[Passport] Deserialization error:', error);
    done(error);
  }
});

console.log('✓ Passport configured (Keycloak-only mode with Mongoose)');

export default passport;
