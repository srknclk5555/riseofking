const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

class EventController {
  // Etkinlik şeması ve sabit verileri oluştur
  static async ensureSchema() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_types (
          id SERIAL PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_schedules (
          id SERIAL PRIMARY KEY,
          event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
          time_of_day TIME NOT NULL,
          UNIQUE (event_type_id, time_of_day)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_results (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
          event_date DATE NOT NULL,
          scheduled_time TIME NOT NULL,
          result TEXT NOT NULL CHECK (result IN ('WIN','LOSE')),
          profit NUMERIC(18,2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, event_type_id, event_date, scheduled_time)
        );
      `);

      const eventTypes = [
        { code: 'INFERNO_TEMPLE', name: 'Inferno Temple' },
        { code: 'CRYSTAL_FORTRESS_WAR', name: 'Crystal Fortress War' },
        { code: 'DEATH_MATCH', name: 'Death Match' },
        { code: 'MOUNT_RACE', name: 'Mount Race' }
      ];

      for (const { code, name } of eventTypes) {
        await pool.query(
          `
          INSERT INTO event_types (code, name)
          VALUES ($1, $2)
          ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
        `,
          [code, name]
        );
      }

      const schedules = [
        // Inferno Temple - 08:00, 20:30
        { code: 'INFERNO_TEMPLE', time: '08:00' },
        { code: 'INFERNO_TEMPLE', time: '20:30' },
        // Crystal Fortress War - 02:00, 14:00, 20:00
        { code: 'CRYSTAL_FORTRESS_WAR', time: '02:00' },
        { code: 'CRYSTAL_FORTRESS_WAR', time: '14:00' },
        { code: 'CRYSTAL_FORTRESS_WAR', time: '20:00' },
        // Death Match - 03:00, 11:00, 17:00
        { code: 'DEATH_MATCH', time: '03:00' },
        { code: 'DEATH_MATCH', time: '11:00' },
        { code: 'DEATH_MATCH', time: '17:00' },
        // Mount Race - 06:00, 10:00, 15:00, 18:00
        { code: 'MOUNT_RACE', time: '06:00' },
        { code: 'MOUNT_RACE', time: '10:00' },
        { code: 'MOUNT_RACE', time: '15:00' },
        { code: 'MOUNT_RACE', time: '18:00' }
      ];

      for (const { code, time } of schedules) {
        const typeResult = await pool.query(
          'SELECT id FROM event_types WHERE code = $1',
          [code]
        );
        if (typeResult.rows.length === 0) {
          continue;
        }
        const eventTypeId = typeResult.rows[0].id;
        await pool.query(
          `
          INSERT INTO event_schedules (event_type_id, time_of_day)
          VALUES ($1, $2)
          ON CONFLICT (event_type_id, time_of_day) DO NOTHING;
        `,
          [eventTypeId, time]
        );
      }
    } catch (error) {
      console.error('Event schema initialization error:', error);
    }
  }

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

  // Günlük planlı etkinlikleri ve sonuçlarını getir
  static async getDailySchedule(req, res) {
    try {
      const { userId, date } = req.params;

      const result = await pool.query(
        `
        SELECT
          es.id AS schedule_id,
          et.code AS event_type,
          et.name AS event_name,
          es.time_of_day,
          er.id AS result_id,
          er.result,
          er.profit
        FROM event_schedules es
        JOIN event_types et ON et.id = es.event_type_id
        LEFT JOIN event_results er
          ON er.event_type_id = es.event_type_id
         AND er.scheduled_time = es.time_of_day
         AND er.user_id = $1
         AND er.event_date = $2
        ORDER BY et.code, es.time_of_day;
      `,
        [userId, date]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Event daily schedule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Planlı etkinlik sonucu oluştur / güncelle / sil
  static async upsertResult(req, res) {
    try {
      const { userId } = req.params;
      const { eventType, date, time, result, profit } = req.body;

      if (!eventType || !date || !time) {
        return res.status(400).json({ error: 'eventType, date ve time zorunludur.' });
      }

      const typeResult = await pool.query(
        'SELECT id FROM event_types WHERE code = $1',
        [eventType]
      );

      if (typeResult.rows.length === 0) {
        return res.status(400).json({ error: 'Geçersiz eventType' });
      }

      const eventTypeId = typeResult.rows[0].id;

      if (!result) {
        await pool.query(
          `
          DELETE FROM event_results
          WHERE user_id = $1
            AND event_type_id = $2
            AND event_date = $3
            AND scheduled_time = $4;
        `,
          [userId, eventTypeId, date, time]
        );
        return res.json({ message: 'Event result cleared' });
      }

      if (result !== 'WIN' && result !== 'LOSE') {
        return res.status(400).json({ error: 'result değeri WIN veya LOSE olmalıdır.' });
      }

      const upsertResult = await pool.query(
        `
        INSERT INTO event_results (
          user_id, event_type_id, event_date, scheduled_time, result, profit
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0))
        ON CONFLICT (user_id, event_type_id, event_date, scheduled_time)
        DO UPDATE SET
          result = EXCLUDED.result,
          profit = COALESCE(EXCLUDED.profit, event_results.profit),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `,
        [userId, eventTypeId, date, time, result, profit]
      );

      res.json(upsertResult.rows[0]);
    } catch (error) {
      console.error('Event result upsert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Belirli tarih aralığı için etkinlik istatistikleri
  static async getStats(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, eventType } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterEventType = '';

      if (eventType) {
        filterEventType = ' AND et.code = $4';
        params.push(eventType);
      }

      const result = await pool.query(
        `
        WITH base AS (
          SELECT
            et.code AS event_type,
            et.name AS event_name,
            COUNT(*)::int AS total_participation,
            SUM(CASE WHEN er.result = 'WIN' THEN 1 ELSE 0 END)::int AS wins,
            SUM(CASE WHEN er.result = 'LOSE' THEN 1 ELSE 0 END)::int AS losses
          FROM event_results er
          JOIN event_types et ON et.id = er.event_type_id
          WHERE er.user_id = $1
            AND er.event_date BETWEEN $2 AND $3
            ${filterEventType}
          GROUP BY et.code, et.name
        ),
        profits AS (
          SELECT
            et.code AS event_type,
            COALESCE(SUM(el.count * el.price), 0)::numeric AS total_profit
          FROM event_logs el
          JOIN event_types et ON et.name = el.event_type
          WHERE el.user_id = $1
            AND el.date BETWEEN $2 AND $3
            AND el.item_name <> '__duration__'
          GROUP BY et.code
        )
        SELECT
          b.event_type,
          b.event_name,
          b.total_participation,
          b.wins,
          b.losses,
          CASE WHEN b.total_participation > 0
               THEN ROUND(100.0 * b.wins::numeric / b.total_participation::numeric, 2)
               ELSE 0
          END AS win_rate,
          COALESCE(p.total_profit, 0) AS total_profit
        FROM base b
        LEFT JOIN profits p ON p.event_type = b.event_type
        ORDER BY b.event_type;
      `,
        params
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Event stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Rapor özeti: sonuç + süre + verimlilik (gold/saat)
  static async getReportSummary(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, eventType } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterEventType = '';

      if (eventType) {
        filterEventType = ' AND et.code = $4';
        params.push(eventType);
      }

      const result = await pool.query(
        `
        WITH results AS (
          SELECT
            er.user_id,
            er.event_type_id,
            et.code AS event_type,
            et.name AS event_name,
            COUNT(*)::int AS total_participation,
            SUM(CASE WHEN er.result = 'WIN' THEN 1 ELSE 0 END)::int AS wins,
            SUM(CASE WHEN er.result = 'LOSE' THEN 1 ELSE 0 END)::int AS losses
          FROM event_results er
          JOIN event_types et ON et.id = er.event_type_id
          WHERE er.user_id = $1
            AND er.event_date BETWEEN $2 AND $3
            ${filterEventType}
          GROUP BY er.user_id, er.event_type_id, et.code, et.name
        ),
        profits AS (
          SELECT
            el.user_id,
            et.id AS event_type_id,
            COALESCE(SUM(el.count * el.price), 0)::numeric AS total_profit
          FROM event_logs el
          JOIN event_types et ON et.name = el.event_type
          WHERE el.user_id = $1
            AND el.date BETWEEN $2 AND $3
            AND el.item_name <> '__duration__'
            ${filterEventType}
          GROUP BY el.user_id, et.id
        ),
        durations AS (
          SELECT
            el.user_id,
            el.event_type AS event_name_key,
            COALESCE(SUM(el.duration), 0)::int AS total_duration_minutes
          FROM event_logs el
          WHERE el.user_id = $1
            AND el.date BETWEEN $2 AND $3
            AND el.item_name = '__duration__'
          GROUP BY el.user_id, el.event_type
        )
        SELECT
          r.event_type,
          r.event_name,
          r.total_participation,
          r.wins,
          r.losses,
          CASE WHEN r.total_participation > 0
            THEN ROUND(100.0 * r.wins::numeric / r.total_participation::numeric, 2)
            ELSE 0
          END AS win_rate,
          COALESCE(p.total_profit, 0) AS total_profit,
          COALESCE(d.total_duration_minutes, 0) AS total_duration_minutes,
          CASE WHEN COALESCE(d.total_duration_minutes, 0) > 0
            THEN ROUND((COALESCE(p.total_profit, 0)::numeric) / (COALESCE(d.total_duration_minutes,0)::numeric / 60.0), 2)
            ELSE NULL
          END AS gold_per_hour,
          CASE WHEN r.total_participation > 0
            THEN ROUND(COALESCE(p.total_profit, 0)::numeric / r.total_participation::numeric, 2)
            ELSE NULL
          END AS avg_profit_per_run
        FROM results r
        LEFT JOIN profits p
          ON p.user_id = r.user_id
         AND p.event_type_id = r.event_type_id
        LEFT JOIN durations d
          ON d.user_id = r.user_id
         AND d.event_name_key = r.event_name
        ORDER BY r.event_type;
      `,
        params
      );

      const totals = result.rows.reduce(
        (acc, row) => {
          acc.total_profit += Number(row.total_profit || 0);
          acc.total_participation += Number(row.total_participation || 0);
          acc.wins += Number(row.wins || 0);
          acc.losses += Number(row.losses || 0);
          acc.total_duration_minutes += Number(row.total_duration_minutes || 0);
          return acc;
        },
        {
          total_profit: 0,
          total_participation: 0,
          wins: 0,
          losses: 0,
          total_duration_minutes: 0
        }
      );

      const overallWinRate =
        totals.total_participation > 0
          ? Math.round((100 * totals.wins / totals.total_participation) * 100) / 100
          : 0;

      const overallGoldPerHour =
        totals.total_duration_minutes > 0
          ? Math.round((totals.total_profit / (totals.total_duration_minutes / 60)) * 100) / 100
          : null;

      res.json({
        range: { from, to },
        totals: { ...totals, win_rate: overallWinRate, gold_per_hour: overallGoldPerHour },
        byEvent: result.rows
      });
    } catch (error) {
      console.error('Event report summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Günlük toplam kazanç zaman serisi (tahminleme için)
  static async getProfitTimeSeries(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, eventType } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterEventType = '';

      if (eventType) {
        filterEventType = ' AND et.code = $4';
        params.push(eventType);
      }

      const result = await pool.query(
        `
        SELECT
          el.date::date AS date,
          COALESCE(SUM(el.count * el.price), 0)::numeric AS total_profit
        FROM event_logs el
        JOIN event_types et ON et.name = el.event_type
        WHERE el.user_id = $1
          AND el.date BETWEEN $2 AND $3
          AND el.item_name <> '__duration__'
          ${filterEventType}
        GROUP BY el.date
        ORDER BY el.date;
      `,
        params
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Event profit timeseries error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Günlük breakdown: etkinlik bazında gün/gün kazanç + win/lose + süre + gold/saat
  static async getDailyBreakdown(req, res) {
    try {
      const { userId } = req.params;
      const { from, to, eventType } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from ve to tarihleri zorunludur.' });
      }

      const params = [userId, from, to];
      let filterEventType = '';

      if (eventType) {
        filterEventType = ' AND et.code = $4';
        params.push(eventType);
      }

      const result = await pool.query(
        `
        WITH results AS (
          SELECT
            er.event_date::date AS date,
            et.code AS event_type,
            et.name AS event_name,
            COUNT(*)::int AS participation,
            SUM(CASE WHEN er.result = 'WIN' THEN 1 ELSE 0 END)::int AS wins,
            SUM(CASE WHEN er.result = 'LOSE' THEN 1 ELSE 0 END)::int AS losses
          FROM event_results er
          JOIN event_types et ON et.id = er.event_type_id
          WHERE er.user_id = $1
            AND er.event_date BETWEEN $2 AND $3
            ${filterEventType}
          GROUP BY er.event_date, et.code, et.name
        ),
        profits AS (
          SELECT
            el.date::date AS date,
            et.code AS event_type,
            COALESCE(SUM(el.count * el.price), 0)::numeric AS total_profit
          FROM event_logs el
          JOIN event_types et ON et.name = el.event_type
          WHERE el.user_id = $1
            AND el.date BETWEEN $2 AND $3
            AND el.item_name <> '__duration__'
            ${filterEventType}
          GROUP BY el.date, et.code
        ),
        durations AS (
          SELECT
            el.date::date AS date,
            el.event_type AS event_name_key,
            COALESCE(SUM(el.duration), 0)::int AS total_duration_minutes
          FROM event_logs el
          WHERE el.user_id = $1
            AND el.date BETWEEN $2 AND $3
            AND el.item_name = '__duration__'
          GROUP BY el.date, el.event_type
        )
        SELECT
          r.date,
          r.event_type,
          r.event_name,
          r.participation,
          r.wins,
          r.losses,
          CASE WHEN r.participation > 0
            THEN ROUND(100.0 * r.wins::numeric / r.participation::numeric, 2)
            ELSE 0
          END AS win_rate,
          COALESCE(p.total_profit, 0) AS total_profit,
          COALESCE(d.total_duration_minutes, 0) AS total_duration_minutes,
          CASE WHEN COALESCE(d.total_duration_minutes, 0) > 0
            THEN ROUND((COALESCE(p.total_profit, 0)::numeric) / (COALESCE(d.total_duration_minutes,0)::numeric / 60.0), 2)
            ELSE NULL
          END AS gold_per_hour
        FROM results r
        LEFT JOIN profits p
          ON p.date = r.date
         AND p.event_type = r.event_type
        LEFT JOIN durations d
          ON d.date = r.date
         AND d.event_name_key = r.event_name
        ORDER BY r.date, r.event_type;
      `,
        params
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Event daily breakdown error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = EventController;