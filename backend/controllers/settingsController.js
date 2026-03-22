const db = require('../config/database');
const socketManager = require('../socket/socketManager');

const defaultAdSettings = {
  visibility: {
    top: true,
    left: true,
    right: true,
    sidebar: true
  },
  carouselInterval: 4000,
  topHeight: 80,
  topAds: [
    { id: 1, image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop', link: 'https://www.google.com' }
  ],
  leftAd: { image: 'https://images.unsplash.com/photo-1614850523296-62c0af475390?q=80&w=2070&auto=format&fit=crop', link: 'https://www.google.com' },
  rightAd: { image: 'https://images.unsplash.com/photo-1614850523296-62c0af475390?q=80&w=2070&auto=format&fit=crop', link: 'https://www.google.com' },
  sidebarAd: { image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop', link: 'https://www.google.com' }
};

// 1. Uygulama başlatıldığında veya ilk bağlantıda Tabloyu Olusturur
const ensureSettingsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // İlk reklam ayarını yoksay varsayılanla doldur (Eğer yoksa)
    const result = await db.query(`SELECT value FROM settings WHERE key = 'adSettings'`);
    if (result.rows.length === 0) {
      await db.query(
        `INSERT INTO settings (key, value) VALUES ('adSettings', $1)`,
        [JSON.stringify(defaultAdSettings)]
      );
      console.log('[SCHEMA] Varsayılan küresel reklam ayarları eklendi.');
    }
    console.log('[SCHEMA] Ayarlar tablosu doğrulandı.');
  } catch (err) {
    console.error('[SCHEMA] Ayarlar tablosu doğrulanırken hata:', err.message);
  }
};

// 2. Herkese açık: Aktif Reklam ayarlarını döndürür
const getAdSettings = async (req, res) => {
  try {
    const result = await db.query(`SELECT value FROM settings WHERE key = 'adSettings'`);
    if (result.rows.length === 0) {
      return res.json(defaultAdSettings); // Fallback
    }
    return res.json(result.rows[0].value);
  } catch (error) {
    console.error('Reklam ayarları çekilirken hata:', error);
    res.status(500).json({ error: 'Ayarlar getirilemedi.' });
  }
};

// 3. YALNIZCA ASTRAL1 İçerir: Yeni reklam ayarlarını atar
const updateAdSettings = async (req, res) => {
  try {
    // req.isAdmin zaten requireAdmin ara yazılımında test edilmiş olacak.
    const newSettings = req.body;
    if (!newSettings || typeof newSettings !== 'object') {
      return res.status(400).json({ error: 'Geçersiz ayar verisi' });
    }

    // Mevcut ayarı veritabanından getir
    const current = await db.query(`SELECT value FROM settings WHERE key = 'adSettings'`);
    let finalSettings = defaultAdSettings;
    
    if (current.rows.length > 0) {
      finalSettings = { ...current.rows[0].value, ...newSettings };
    } else {
      finalSettings = { ...defaultAdSettings, ...newSettings };
    }

    // JSON'a çevirip veritabanına UP/INSERT işlemi yapıyoruz
    await db.query(
      `INSERT INTO settings (key, value) VALUES ('adSettings', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(finalSettings)]
    );

    // BÜTÜN SUNUCUYA DEĞİŞİKLİĞİ SOKET ÜZERİNDEN YAYINLA
    const io = socketManager.getIO();
    if (io) {
      // Event: GLOBAL_SETTINGS_UPDATED
      io.emit('GLOBAL_SETTINGS_UPDATED', { type: 'adSettings', data: finalSettings });
    }

    res.json({ message: 'Ayarlar başarıyla güncellendi', data: finalSettings });
  } catch (error) {
    console.error('Reklam ayarları kaydedilirken hata:', error);
    res.status(500).json({ error: 'Ayarlar güncellenemedi.' });
  }
};

module.exports = {
  ensureSettingsTable,
  getAdSettings,
  updateAdSettings
};
