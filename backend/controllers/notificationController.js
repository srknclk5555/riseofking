const pool = require('../config/database');

// Tüm bildirimleri getir
const getAllNotifications = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Bildirim getirme hatası:', error);
    res.status(500).json({ error: 'Bildirimler getirilemedi' });
  }
};

// Belirli bir bildirimi ID ile getir
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Bildirim getirme hatası:', error);
    res.status(500).json({ error: 'Bildirim getirilemedi' });
  }
};

// Kullanıcının bildirimlerini getir
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, read } = req.query;
    
    let query = 'SELECT * FROM notifications WHERE receiver_id = $1';
    const params = [userId];
    
    if (read !== undefined) {
      query += ' AND read = $2';
      params.push(read === 'true');
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit));
    params.push(parseInt(offset));
    
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Kullanıcı bildirimleri getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı bildirimleri getirilemedi' });
  }
};

// Yeni bildirim ekle
const createNotification = async (req, res) => {
  try {
    const { receiver_id, title, text, related_id, read, type, priority } = req.body;
    
    const result = await pool.query(
      `INSERT INTO notifications (
        receiver_id, title, text, related_id, read, type, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [receiver_id, title, text, related_id, read, type, priority]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Bildirim ekleme hatası:', error);
    res.status(500).json({ error: 'Bildirim eklenemedi' });
  }
};

// Bildirim güncelle
const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiver_id, title, text, related_id, read, type, priority } = req.body;
    
    const result = await pool.query(
      `UPDATE notifications SET 
        receiver_id=$1, title=$2, text=$3, related_id=$4, read=$5, 
        type=$6, priority=$7, updated_at=CURRENT_TIMESTAMP
        WHERE id=$8 RETURNING *`,
      [receiver_id, title, text, related_id, read, type, priority, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Bildirim güncelleme hatası:', error);
    res.status(500).json({ error: 'Bildirim güncellenemedi' });
  }
};

// Bildirim sil
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı' });
    }
    
    res.status(200).json({ message: 'Bildirim başarıyla silindi' });
  } catch (error) {
    console.error('❌ Bildirim silme hatası:', error);
    res.status(500).json({ error: 'Bildirim silinemedi' });
  }
};

// Bildirimi okundu olarak işaretle
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Bildirim okundu olarak işaretleme hatası:', error);
    res.status(500).json({ error: 'Bildirim okundu olarak işaretlenemedi' });
  }
};

// Kullanıcının okunmamış bildirim sayısını getir
const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE receiver_id = $1 AND read = false',
      [userId]
    );
    res.status(200).json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('❌ Okunmamış bildirim sayısı getirme hatası:', error);
    res.status(500).json({ error: 'Okunmamış bildirim sayısı getirilemedi' });
  }
};

// Kullanıcının tüm bildirimlerini okundu olarak işaretle
const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET read = true, updated_at = CURRENT_TIMESTAMP WHERE receiver_id = $1 AND read = false RETURNING *',
      [userId]
    );
    
    res.status(200).json({ 
      message: 'Tüm bildirimler okundu olarak işaretlendi',
      updated_count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Tüm bildirimleri okundu olarak işaretleme hatası:', error);
    res.status(500).json({ error: 'Tüm bildirimler okundu olarak işaretlenemedi' });
  }
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  getUserNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  markAsRead,
  getUnreadCount,
  markAllAsRead
};