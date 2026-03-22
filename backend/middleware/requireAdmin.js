const db = require('../config/database');

/**
 * Bu middleware (ara yazılım) bir rotaya gelen isteği kontrol eder.
 * SADECE yetkili ('astral1') giriş yaptıysa işlemin devam etmesine izin verir.
 * Aksi takdirde 403 (Erişim Reddedildi) veya 401 (Yetkisiz) döner.
 */
const requireAdmin = async (req, res, next) => {
  try {
    // 1. Kullanıcı JSON Web Token veya oturum ile giriş yapmış mı?
    if (!req.user || !req.user.uid) {
      console.warn('[SECURITY] requireAdmin: Token veya UID bulunamadı.');
      return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    const uid = req.user.uid;

    // 2. Veritabanından bu UID'nin gerçekten var olup olmadığını ve 'username' bilgisini kontrol et.
    // Asla sadece Client'tan gelen bilgiye güvenmiyoruz.
    const result = await db.query(
      `SELECT username FROM users WHERE uid = $1 LIMIT 1;`,
      [uid]
    );

    if (result.rows.length === 0) {
      console.warn(`[SECURITY] requireAdmin: Veritabanında UID (${uid}) bulunamadı.`);
      return res.status(401).json({ error: 'Geçersiz kullanıcı hesabı.' });
    }

    const username = result.rows[0].username;

    // 3. Kullanıcı adının tam olarak 'astral1' olup olmadığını kontrol et.
    if (username !== 'astral1') {
      console.warn(`[SECURITY] requireAdmin: Yetkisiz bir hesap ('${username}') admin sınırını aşmaya çalıştı.`);
      return res.status(403).json({ error: 'Bu işlemi sadece sistem yöneticisi (astral1) gerçekleştirebilir.' });
    }

    // 4. Her şey tamam, işlem güvenli. Rötaya devam et (next).
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('[SECURITY] requireAdmin sırasında hata oluştu:', error);
    res.status(500).json({ error: 'Güvenlik denetimi sırasında bir sunucu hatası oluştu.' });
  }
};

module.exports = requireAdmin;
