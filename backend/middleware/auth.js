const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { isUserQuarantined } = require('../socket/socketManager');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

module.exports = async function authMiddleware(req, res, next) {
  try {
    let token;
    let tokenSource;

    // ÖNCELİK SIRASI:
    // 1. httpOnly Cookie (en güvenli - XSS korumalı)
    // 2. Authorization Header (fallback - socket.io için)
    
    if (req.cookies?.token) {
      token = req.cookies.token;
      tokenSource = 'cookie';
      console.log('[AUTH] Token from httpOnly cookie');
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenSource = 'header';
      console.log('[AUTH] Token from Authorization header');
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authorization required',
        message: 'No token provided in cookie or Authorization header'
      });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = payload.sub || payload.userId || payload.uid || payload.id;
      
      console.log(`[AUTH DEBUG] JWT Verified (${tokenSource}). UserID:`, userId);

      if (!userId) {
        return res.status(401).json({ error: 'Token does not contain user id' });
      }

      // 🛡️ KARANTİNA (BAN) KONTROLÜ
      if (isUserQuarantined(userId)) {
        console.warn(`[API DEFANS] Banlı kullanıcı işlem yapmaya çalıştı: ${userId}`);
        res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' }); // Kullanıcıyı sistemden at
        return res.status(403).json({ 
            error: 'Spam nedeniyle 5 dakika uzaklaştırıldınız.',
            forceLogout: true 
        });
      }
      
      req.user = { 
        id: payload.id, 
        uid: payload.uid, 
        email: payload.email, 
        username: payload.username, 
        jwt: true, 
        claims: payload,
        tokenSource: tokenSource
      };
      
      return next();
      
    } catch (e) {
      console.log('[AUTH DEBUG] JWT verify failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Auth failure' });
  }
};
