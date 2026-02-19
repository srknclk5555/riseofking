const pool = require('../config/database');
const { sendToUser } = require('../socket/socketManager');

/**
 * Merkezi Bildirim Servisi
 */
class NotificationService {
    /**
     * Yeni bir bildirim oluşturur, DB'ye kaydeder ve alıcıya anlık iletir.
     * @param {Object} data - Bildirim verileri
     * @param {string} data.receiver_id - Alıcı UID
     * @param {string} data.title - Bildirim başlığı
     * @param {string} data.text - Bildirim içeriği
     * @param {string} [data.related_id] - İlgili kayıt ID'si (Run ID, Farm ID vb.)
     * @param {string} [data.type] - Bildirim tipi (message, farm, logic, boss)
     * @param {string} [data.priority] - Öncelik (low, normal, high)
     */
    static async create({ receiver_id, title, text, related_id, type = 'general', priority = 'normal' }) {
        try {
            // 1. DB'ye kaydet
            const result = await pool.query(
                `INSERT INTO notifications (
          receiver_id, title, text, related_id, type, priority, read
        ) VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
                [receiver_id, title, text, related_id, type, priority]
            );

            const notification = result.rows[0];

            // 2. Socket üzerinden anlık ilet
            sendToUser(receiver_id, 'notification_received', notification);

            console.log(`[NotificationService] Created and sent to ${receiver_id}: ${title}`);
            return notification;
        } catch (error) {
            console.error('[NotificationService] Error creating notification:', error);
            // Hata olsa bile ana işlem durmasın diye throw etmiyoruz (Opsiyonel)
            return null;
        }
    }

    /**
     * Çoklu bildirim oluşturur (örn: Tüm farm katılımcılarına)
     */
    static async createMultiple(notifications) {
        const results = [];
        for (const notif of notifications) {
            const res = await this.create(notif);
            if (res) results.push(res);
        }
        return results;
    }
}

module.exports = NotificationService;
