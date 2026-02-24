const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

class EventController {
  // Tüm etkinlik loglarını getir
  static async getAllLogs(req, res) {
    try {
      const { userId } = req.params;
      const { date, eventType } = req.query;

      let query = 'SELECT * FROM event_logs WHERE user_id = $1';
      const params = [userId];

      if (date) {
        query += ' AND date = $2';
        params.push(date);
      }

      if (eventType) {
        query += ` AND event_type = $${params.length + 1}`;
        params.push(eventType);
      }

      query += ' ORDER BY date DESC, event_type, item_name';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Event logs get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Belirli tarih için etkinlik loglarını getir
  static async getLogsByDate(req, res) {
    try {
      const { userId, date } = req.params;
      const { eventType } = req.query;

      let query = 'SELECT * FROM event_logs WHERE user_id = $1 AND date = $2';
      const params = [userId, date];

      if (eventType) {
        query += ' AND event_type = $3';
        params.push(eventType);
      }

      query += ' ORDER BY event_type, item_name';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Event logs by date error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Yeni etkinlik logu oluştur
  static async createLog(req, res) {
    try {
      const { userId } = req.params;
      const { date, eventType, itemName, count, price, duration } = req.body;

      const result = await pool.query(
        `INSERT INTO event_logs (user_id, date, event_type, item_name, count, price, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, date, event_type, item_name)
         DO UPDATE SET count = $5, price = $6, duration = $7, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, date, eventType, itemName, count || 0, price || 0, duration || 0]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Event log create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Etkinlik logunu güncelle
  static async updateLog(req, res) {
    try {
      const { id } = req.params;
      const { count, price, duration } = req.body;

      const result = await pool.query(
        `UPDATE event_logs 
         SET count = COALESCE($1, count), 
             price = COALESCE($2, price), 
             duration = COALESCE($3, duration),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [count, price, duration, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event log not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Event log update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Etkinlik logunu sil
  static async deleteLog(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM event_logs WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event log not found' });
      }

      res.json({ message: 'Event log deleted successfully' });
    } catch (error) {
      console.error('Event log delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Belirli etkinlik için süre getir
  static async getDuration(req, res) {
    try {
      const { userId, date, eventType } = req.params;

      const result = await pool.query(
        'SELECT duration FROM event_logs WHERE user_id = $1 AND date = $2 AND event_type = $3 LIMIT 1',
        [userId, date, eventType]
      );

      if (result.rows.length === 0) {
        return res.json({ duration: 0 });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Event duration get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Etkinlik süresini güncelle
  static async updateDuration(req, res) {
    try {
      const { userId, date, eventType } = req.params;
      const { duration } = req.body;

      const result = await pool.query(
        `INSERT INTO event_logs (user_id, date, event_type, item_name, duration)
         VALUES ($1, $2, $3, '__duration__', $4)
         ON CONFLICT (user_id, date, event_type, item_name)
         DO UPDATE SET duration = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, date, eventType, duration || 0]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Event duration update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = EventController;