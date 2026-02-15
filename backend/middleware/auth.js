const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize firebase-admin if service account exists in backend root
try {
  const svcPath = path.join(__dirname, '..', 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
  if (fs.existsSync(svcPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(svcPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase admin initialized for token verification');
    } catch (innerErr) {
      console.warn('Firebase admin init failed (invalid JSON):', innerErr.message);
    }
  }
} catch (e) {
  console.warn('Firebase admin init check failed:', e.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_real_secret';

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2) return res.status(401).json({ error: 'Invalid authorization header format' });

    const token = parts[1];

    // Try Firebase token verification first (if admin initialized)
    if (admin.apps && admin.apps.length > 0) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('[AUTH DEBUG] Firebase Token Verified. UID:', decoded.uid);
        req.user = { id: decoded.uid, uid: decoded.uid, firebase: true, claims: decoded };
        return next();
      } catch (e) {
        console.log('[AUTH DEBUG] Firebase verify failed:', e.message);
        // continue to JWT check
      }
    }

    // Fallback: JWT verify
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      // Accept several possible fields
      const userId = payload.sub || payload.userId || payload.uid || payload.id;
      console.log('[AUTH DEBUG] JWT Verified. UserID:', userId);

      if (!userId) return res.status(401).json({ error: 'Token does not contain user id' });
      req.user = { id: payload.id, uid: payload.uid, email: payload.email, username: payload.username, jwt: true, claims: payload };
      return next();
    } catch (e) {
      console.log('[AUTH DEBUG] JWT verify failed:', e.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Auth failure' });
  }
};
