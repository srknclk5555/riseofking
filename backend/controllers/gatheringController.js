require('dotenv').config();
const pool = require('../config/database');

class GatheringController {
  // Tüm toplama loglarını getir
  static async getAllLogs(req, res) {
    try {
      if (req.params.userId !== req.user.uid) {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
      }

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
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [count, price, duration, id, req.user.uid]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
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
        'DELETE FROM gathering_logs WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, req.user.uid]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
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
      if (req.params.userId !== req.user.uid) {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
      }

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
      if (req.params.userId !== req.user.uid) {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
      }

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

  // Rapor özeti: toplam kâr + süre + verimlilik
  static async getReportSummary(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, profession } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterProfession = '';

      if (profession && profession !== 'ALL') {
        filterProfession = ' AND profession = $4';
        params.push(profession);
      }

      const result = await pool.query(
        `
        WITH profits AS (
          SELECT
            profession,
            COALESCE(SUM(count * price), 0)::numeric AS total_profit
          FROM gathering_logs
          WHERE user_id = $1
            AND date BETWEEN $2 AND $3
            AND item_name <> '__duration__'
            ${filterProfession}
          GROUP BY profession
        ),
        durations AS (
          SELECT
            profession,
            COALESCE(SUM(duration), 0)::int AS total_duration_minutes
          FROM gathering_logs
          WHERE user_id = $1
            AND date BETWEEN $2 AND $3
            AND item_name = '__duration__'
            ${filterProfession}
          GROUP BY profession
        )
        SELECT
          p.profession,
          COALESCE(p.total_profit, 0) AS total_profit,
          COALESCE(d.total_duration_minutes, 0) AS total_duration_minutes,
          CASE WHEN COALESCE(d.total_duration_minutes, 0) > 0
            THEN ROUND((COALESCE(p.total_profit,0)::numeric) / (COALESCE(d.total_duration_minutes,0)::numeric / 60.0), 2)
            ELSE NULL
          END AS gold_per_hour
        FROM profits p
        FULL OUTER JOIN durations d ON d.profession = p.profession
        ORDER BY p.profession;
      `,
        params
      );

      const totals = result.rows.reduce(
        (acc, row) => {
          acc.total_profit += Number(row.total_profit || 0);
          acc.total_duration_minutes += Number(row.total_duration_minutes || 0);
          return acc;
        },
        { total_profit: 0, total_duration_minutes: 0 }
      );

      const overallGoldPerHour =
        totals.total_duration_minutes > 0
          ? Math.round((totals.total_profit / (totals.total_duration_minutes / 60)) * 100) / 100
          : null;

      res.json({
        range: { from, to },
        totals: { ...totals, gold_per_hour: overallGoldPerHour },
        byProfession: result.rows
      });
    } catch (error) {
      console.error('Gathering report summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Günlük toplam kâr zaman serisi
  static async getProfitTimeSeries(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, profession } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterProfession = '';

      if (profession && profession !== 'ALL') {
        filterProfession = ' AND profession = $4';
        params.push(profession);
      }

      const result = await pool.query(
        `
        SELECT
          date::date AS date,
          COALESCE(SUM(count * price), 0)::numeric AS total_profit
        FROM gathering_logs
        WHERE user_id = $1
          AND date BETWEEN $2 AND $3
          AND item_name <> '__duration__'
          ${filterProfession}
        GROUP BY date
        ORDER BY date;
      `,
        params
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Gathering profit timeseries error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Günlük breakdown
  static async getDailyBreakdown(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, profession } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterProfession = '';

      if (profession && profession !== 'ALL') {
        filterProfession = ' AND profession = $4';
        params.push(profession);
      }

      const result = await pool.query(
        `
        WITH profits AS (
          SELECT
            date::date AS date,
            profession,
            COALESCE(SUM(count * price), 0)::numeric AS total_profit
          FROM gathering_logs
          WHERE user_id = $1
            AND date BETWEEN $2 AND $3
            AND item_name <> '__duration__'
            ${filterProfession}
          GROUP BY date, profession
        ),
        durations AS (
          SELECT
            date::date AS date,
            profession,
            COALESCE(SUM(duration), 0)::int AS total_duration_minutes
          FROM gathering_logs
          WHERE user_id = $1
            AND date BETWEEN $2 AND $3
            AND item_name = '__duration__'
            ${filterProfession}
          GROUP BY date, profession
        )
        SELECT
          p.date,
          p.profession,
          COALESCE(p.total_profit, 0) AS total_profit,
          COALESCE(d.total_duration_minutes, 0) AS total_duration_minutes,
          CASE WHEN COALESCE(d.total_duration_minutes, 0) > 0
            THEN ROUND((COALESCE(p.total_profit,0)::numeric) / (COALESCE(d.total_duration_minutes,0)::numeric / 60.0), 2)
            ELSE NULL
          END AS gold_per_hour
        FROM profits p
        LEFT JOIN durations d ON d.date = p.date AND d.profession = p.profession
        ORDER BY p.date DESC, p.profession;
      `,
        params
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Gathering daily breakdown error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = GatheringController;