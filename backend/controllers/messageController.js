const { Pool } = require('pg');
const EncryptionService = require('../services/encryptionService');
const NotificationService = require('../services/notificationService');
const { getIO, sendToUser } = require('../socket/socketManager');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '..', 'debug_auth.log');
function logDebug(msg) {
  try { fs.appendFileSync(logFile, new Date().toISOString() + ' [MSG]: ' + msg + '\n'); } catch (e) { }
}

class MessageController {

  // Güvenlik Kontrolü: Engellenmiş mi?
  static async checkBlockStatus(senderId, receiverId) {
    const result = await pool.query(
      `SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
      [receiverId, senderId]
    );
    return result.rows.length > 0;
  }

  // Tüm mesajları getir (Decrypted)
  static async getAllMessages(req, res) {
    try {
      const { userId } = req.params;

      console.log(`[MSG DEBUG] getAllMessages - UserID Param: ${userId}, AuthUser ID: ${req.user.id}`);
      logDebug(`getAllMessages Check - UserID Param: "${userId}", AuthUser ID: "${req.user.id}", Type: ${typeof req.user.id}`);

      // GÜVENLİK: Sadece kendi mesajlarını görebilir
      if (req.user.uid !== userId) {
        logDebug(`BLOCKED! Param: "${userId}" !== Token: "${req.user.id}"`);
        console.warn(`[MSG BLOCKED] Unauthorized access. Param: ${userId}, Token: ${req.user.id}`);
        return res.status(403).json({
          error: 'Unauthorized access to messages',
          debug_info: {
            url_param_userId: userId,
            token_userId: req.user.id,
            token_firebase: req.user.firebase,
            token_jwt: req.user.jwt
          }
        });
      }

      const result = await pool.query(
        `SELECT * FROM private_messages 
         WHERE $1 = ANY(participants)
         AND (
           (sender_id = $1 AND deleted_by_sender = false) OR 
           (receiver_id = $1 AND deleted_by_receiver = false)
         )
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId]
      );

      // Mesajları çöz ve kullanıcı adlarını ekle
      const decryptedMessages = await Promise.all(result.rows.map(async msg => {
        // Göndericinin kullanıcı adını al
        const userResult = await pool.query(
          'SELECT username FROM users WHERE uid = $1',
          [msg.sender_id]
        );

        return {
          ...msg,
          text: EncryptionService.decrypt(msg.text),
          senderUsername: userResult.rows[0]?.username || null
        };
      }));

      res.json(decryptedMessages);
    } catch (error) {
      console.error('Messages get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // İki kullanıcı arasındaki konuşmayı getir
  static async getConversation(req, res) {
    try {
      const { userId, contactId } = req.params;

      // GÜVENLİK
      if (req.user.uid !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to conversation' });
      }

      const result = await pool.query(
        `SELECT * FROM private_messages 
         WHERE (
           (sender_id = $1 AND receiver_id = $2 AND deleted_by_sender = false) 
           OR (sender_id = $2 AND receiver_id = $1 AND deleted_by_receiver = false)
         )
         ORDER BY created_at ASC`,
        [userId, contactId]
      );

      // Mesajları çöz ve kullanıcı adlarını ekle
      const decryptedMessages = await Promise.all(result.rows.map(async msg => {
        // Göndericinin kullanıcı adını al
        const userResult = await pool.query(
          'SELECT username FROM users WHERE uid = $1',
          [msg.sender_id]
        );

        return {
          ...msg,
          text: EncryptionService.decrypt(msg.text),
          senderUsername: userResult.rows[0]?.username || null
        };
      }));

      res.json(decryptedMessages);
    } catch (error) {
      console.error('Conversation get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Yeni mesaj oluştur (Encrypted + Socket)
  static async createMessage(req, res) {
    try {
      const { userId } = req.params;
      const { receiverId, text } = req.body;

      // GÜVENLİK: Kimlik doğrulama
      if (req.user.uid !== userId) {
        logDebug(`IDENTITY MISMATCH: req.user.uid(${req.user.uid}) !== userId(${userId})`);
        return res.status(403).json({ error: 'Sender identity mismatch' });
      }

      logDebug(`Request Body: ${JSON.stringify(req.body)}`);

      // VALIDATION
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }
      if (text.length > 1000) {
        return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
      }

      // ENGELLEME KONTROLÜ
      const isBlocked = await MessageController.checkBlockStatus(userId, receiverId);
      if (isBlocked) {
        // Shadow ban: Gönderildi gibi davran ama kaydetme veya hata dön
        // Kullanıcı deneyimi için hata dönmek daha dürüst olur
        return res.status(403).json({ error: 'You are blocked by this user' });
      }

      // ŞİFRELEME
      logDebug(`Attempting encryption for text length: ${text.length}`);
      const encryptedText = EncryptionService.encrypt(text.trim());
      logDebug(`Encryption successful`);

      logDebug(`Inserting into DB: sender=${userId}, receiver=${receiverId}`);
      const result = await pool.query(
        `INSERT INTO private_messages (sender_id, receiver_id, text, participants, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [userId, receiverId, encryptedText, [userId, receiverId]]
      );
      logDebug(`DB Insert successful, ID: ${result.rows[0]?.id}`);

      const newMessage = result.rows[0];

      // Göndericinin kullanıcı adını al
      const userResult = await pool.query(
        'SELECT username FROM users WHERE uid = $1',
        [userId]
      );
      const senderUsername = userResult.rows[0]?.username || null;

      // SOCKET.IO ile anlık iletim
      // Alıcıya şifresi çözülmüş halini gönder (client tarafında tekrar şifreleme gerekmez çünkü HTTPS var)
      // Ama tutarlılık için DB halini gönderip client'ta decrypt etmek daha güvenli olabilir mi? 
      // Hayır, complexity artar. HTTPS zaten transportu korur. 
      // Client'a plaintext gönderiyoruz.
      const messagePayload = {
        ...newMessage,
        text: text.trim(), // Original text
        senderUsername: senderUsername
      };

      // Alıcıya gönder
      sendToUser(receiverId, 'new_message', messagePayload);

      // Gönderene de gönder (farklı sekmede açıksa senkron olsun)
      sendToUser(userId, 'message_sent', messagePayload);

      // BİLDİRİM: Alıcıya genel bir bildirim de kaydet (Header'da görünmesi için)
      await NotificationService.create({
        receiver_id: receiverId,
        title: 'Yeni Mesaj',
        text: `${senderUsername} size bir mesaj gönderdi: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        related_id: userId, // Mesajı atan kişinin ID'si
        type: 'message',
        priority: 'normal'
      });

      res.status(201).json(messagePayload);
    } catch (error) {
      logDebug(`CRITICAL ERROR in createMessage: ${error.message}\nStack: ${error.stack}`);
      console.error('Message create error:', error);
      res.status(500).json({ error: 'Internal server error', debug: error.message });
    }
  }

  // Mesajı okundu olarak işaretle
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      // GÜVENLİK
      if (req.user.uid !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await pool.query(
        `UPDATE private_messages 
         SET read = true, read_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND receiver_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const updatedMessage = result.rows[0];

      // Gönderene "Okundu" bilgisi (Mavi tik) gönder
      sendToUser(updatedMessage.sender_id, 'message_read_update', {
        messageId: id,
        readAt: updatedMessage.read_at
      });

      res.json(updatedMessage);
    } catch (error) {
      console.error('Message mark as read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mesaj sil (Soft Delete)
  static async deleteMessage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.uid;

      // Mesajı bul
      const msgResult = await pool.query(`SELECT * FROM private_messages WHERE id = $1`, [id]);
      if (msgResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

      const msg = msgResult.rows[0];

      let updateQuery = '';
      let params = [];

      if (msg.sender_id === userId) {
        updateQuery = 'UPDATE private_messages SET deleted_by_sender = true WHERE id = $1';
        params = [id];
      } else if (msg.receiver_id === userId) {
        updateQuery = 'UPDATE private_messages SET deleted_by_receiver = true WHERE id = $1';
        params = [id];
      } else {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await pool.query(updateQuery, params);

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Message delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Okunmamış sayı
  static async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;
      if (req.user.uid !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const result = await pool.query(
        `SELECT COUNT(*) as unread_count FROM private_messages 
         WHERE receiver_id = $1 AND read = false AND deleted_by_receiver = false`,
        [userId]
      );

      res.json({ unreadCount: parseInt(result.rows[0].unread_count) });
    } catch (error) {
      console.error('Unread count error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Bloklama işlemi
  static async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const { blockId } = req.body;

      if (req.user.uid !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await pool.query(
        `INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, blockId]
      );

      res.json({ message: 'User blocked' });
    } catch (error) {
      console.error('Block error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Blok kaldırma
  static async unblockUser(req, res) {
    try {
      const { userId, blockId } = req.params;

      if (req.user.uid !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await pool.query(
        `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
        [userId, blockId]
      );

      res.json({ message: 'User unblocked' });
    } catch (error) {
      console.error('Unblock error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Engellenen kullanıcıları getir
  static async getBlockedUsers(req, res) {
    try {
      const { userId } = req.params;

      if (req.user.uid !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const result = await pool.query(
        `SELECT bu.blocked_id, u.username as blocked_username, u."mainCharacter" as blocked_main_character
         FROM blocked_users bu
         LEFT JOIN users u ON bu.blocked_id = u.uid
         WHERE bu.blocker_id = $1`,
        [userId]
      );

      res.json({ blockedUsers: result.rows });
    } catch (error) {
      console.error('Get blocked users error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = MessageController;