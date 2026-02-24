const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

class GatheringController {
  // Tüm toplama loglarını getir
  static async getAllLogs(req, res) {
    try {
      const { userId } = req.params;
      const { date, profession } = req.query;

      let query = 'SELECT * FROM gathering_logs WHERE user_id = $1';
      const params = [userId];

      if (date) {
        query += ' AND date = $2';
        params.push(date);
      }

      if (profession) {
        query += ` AND profession = $${params.length + 1}`;
        params.push(profession);
      }

      query += ' ORDER BY date DESC, profession, item_name';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Gathering logs get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Belirli tarih için toplama loglarını getir
  static async getLogsByDate(req, res) {
    try {
      const { userId, date } = req.params;
      const { profession } = req.query;

      let query = 'SELECT * FROM gathering_logs WHERE user_id = $1 AND date = $2';
      const params = [userId, date];

      if (profession) {
        query += ' AND profession = $3';
        params.push(profession);
      }

      query += ' ORDER BY profession, item_name';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Gathering logs by date error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Yeni toplama logu oluştur
  static async createLog(req, res) {
    try {
      const { userId } = req.params;
      const { date, profession, itemName, count, price, duration } = req.body;

      const result = await pool.query(
        `INSERT INTO gathering_logs (user_id, date, profession, item_name, count, price, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, date, profession, item_name)
         DO UPDATE SET count = $5, price = $6, duration = $7, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, date, profession, itemName, count || 0, price || 0, duration || 0]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Gathering log create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Toplama logunu güncelle
  static async updateLog(req, res) {
    try {
      const { id } = req.params;
      const { count, price, duration } = req.body;

      const result = await pool.query(
        `UPDATE gathering_logs 
         SET count = COALESCE($1, count), 
             price = COALESCE($2, price), 
             duration = COALESCE($3, duration),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [count, price, duration, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Gathering log not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Gathering log update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Toplama logunu sil
  static async deleteLog(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM gathering_logs WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Gathering log not found' });
      }

      res.json({ message: 'Gathering log deleted successfully' });
    } catch (error) {
      console.error('Gathering log delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Belirli profesyon için süre getir
  static async getDuration(req, res) {
    try {
      const { userId, date, profession } = req.params;

      const result = await pool.query(
        'SELECT duration FROM gathering_logs WHERE user_id = $1 AND date = $2 AND profession = $3 LIMIT 1',
        [userId, date, profession]
      );

      if (result.rows.length === 0) {
        return res.json({ duration: 0 });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Gathering duration get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Profesyon süresini güncelle
  static async updateDuration(req, res) {
    try {
      const { userId, date, profession } = req.params;
      const { duration } = req.body;

      const result = await pool.query(
        `INSERT INTO gathering_logs (user_id, date, profession, item_name, duration)
         VALUES ($1, $2, $3, '__duration__', $4)
         ON CONFLICT (user_id, date, profession, item_name)
         DO UPDATE SET duration = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, date, profession, duration || 0]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Gathering duration update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = GatheringController;