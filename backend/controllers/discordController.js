const { Pool } = require('pg');

const DISCORD_WEBHOOK_PATTERN = /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const validateWebhookUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 500) return false;
  return DISCORD_WEBHOOK_PATTERN.test(url);
};

// Kullanıcı Discord ayarlarını al
const getUserDiscordSettings = async (req, res) => {
  const { userId } = req.params;
  const client = req.dbClient;

  try {
    const query = 'SELECT * FROM user_discord_settings WHERE user_id = $1';
    const result = await client.query(query, [userId]);

    if (result.rows.length === 0) {
      // Kullanıcının ayarları yoksa varsayılan ayarları döndür
      return res.status(200).json({
        user_id: userId,
        discord_webhook_url: '',
        discord_username: '',
        discord_user_id: '',
        discord_mention_enabled: false,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Discord ayarları alınırken hata oluştu:', error);
    res.status(500).json({ error: 'Discord ayarları alınırken hata oluştu', details: error.message });
  }
};

// Kullanıcı Discord ayarlarını güncelle
const updateUserDiscordSettings = async (req, res) => {
  // user_id body'den veya URL'den gelebilir
  let user_id = req.body.user_id || req.params.userId;
  const { discord_webhook_url, discord_username, discord_user_id, discord_mention_enabled } = req.body;
  const client = req.dbClient;

  // Webhook URL doğrulaması
  if (discord_webhook_url && !validateWebhookUrl(discord_webhook_url)) {
    return res.status(400).json({ error: 'Geçersiz Discord webhook URL formatı' });
  }

  try {
    // Mevcut ayarları kontrol et
    const checkQuery = 'SELECT * FROM user_discord_settings WHERE user_id = $1';
    const checkResult = await client.query(checkQuery, [user_id]);

    if (checkResult.rows.length > 0) {
      // Varolan kaydı güncelle
      const updateQuery = `
        UPDATE user_discord_settings 
        SET discord_webhook_url = $2, discord_username = $3, discord_user_id = $4, 
            discord_mention_enabled = $5, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1
        RETURNING *`;
      const result = await client.query(updateQuery, [
        user_id, 
        discord_webhook_url || '', 
        discord_username || '', 
        discord_user_id || '', 
        discord_mention_enabled || false
      ]);
      res.status(200).json(result.rows[0]);
    } else {
      // Yeni ayarları ekle
      const insertQuery = `
        INSERT INTO user_discord_settings 
        (user_id, discord_webhook_url, discord_username, discord_user_id, discord_mention_enabled)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`;
      const result = await client.query(insertQuery, [
        user_id, 
        discord_webhook_url || '', 
        discord_username || '', 
        discord_user_id || '', 
        discord_mention_enabled || false
      ]);
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Discord ayarları güncellenirken hata oluştu:', error);
    res.status(500).json({ error: 'Discord ayarları güncellenirken hata oluştu', details: error.message });
  }
};

// Clan boss run bildirimi gönder
const sendClanBossRunNotification = async (req, res) => {
  const { runData } = req.body;
  const client = req.dbClient;

  try {
    // Clan üyeleri için Discord ayarlarını al
    const clanId = runData.clanId;
    const clanQuery = 'SELECT members FROM clans WHERE id = $1';
    const clanResult = await client.query(clanQuery, [clanId]);

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Klan bulunamadı' });
    }

    const members = clanResult.rows[0].members ? 
      (Array.isArray(clanResult.rows[0].members) ? 
        clanResult.rows[0].members : 
        JSON.parse(clanResult.rows[0].members)) : [];

    // Clan üyeleri için Discord ayarlarını al
    const membersQuery = 'SELECT user_id FROM user_discord_settings WHERE user_id = ANY($1)';
    const membersResult = await client.query(membersQuery, [members]);

    // Her bir üyeye Discord bildirimi gönder
    for (const member of membersResult.rows) {
      const settingsQuery = 'SELECT * FROM user_discord_settings WHERE user_id = $1';
      const settingsResult = await client.query(settingsQuery, [member.user_id]);

      if (settingsResult.rows.length > 0 && settingsResult.rows[0].discord_webhook_url) {
        const setting = settingsResult.rows[0];
        
        // Webhook URL doğrulaması
        if (!validateWebhookUrl(setting.discord_webhook_url)) {
          console.warn(`Geçersiz webhook URL atlanıyor (User: ${member.user_id})`);
          continue;
        }

        // Discord webhookuna bildirim gönder
        await sendDiscordNotification(
          setting.discord_webhook_url,
          runData,
          setting.discord_username,
          setting.discord_user_id,
          setting.discord_mention_enabled
        );
      }
    }

    res.status(200).json({ message: 'Discord bildirimleri gönderildi' });
  } catch (error) {
    console.error('Discord bildirimi gönderilirken hata oluştu:', error);
    res.status(500).json({ error: 'Discord bildirimi gönderilirken hata oluştu', details: error.message });
  }
};

// Discord webhookuna bildirim gönderme fonksiyonu
const sendDiscordNotification = async (webhookUrl, runData, username, userId, mentionEnabled) => {
  // Webhook URL doğrulaması
  if (!validateWebhookUrl(webhookUrl)) {
    console.warn('Geçersiz Discord webhook URL; bildirim gönderilemedi:', webhookUrl);
    return;
  }

  try {
    // Discord mesaj formatı oluştur
    const embed = {
      title: `🔔 Yeni Clan Boss Kaydı`,
      description: `${runData.bossName} boss run\'u kaydedildi.`,
      color: 0x00ff00, // Yeşil renk
      fields: [
        {
          name: "Tarih",
          value: runData.date || new Date().toISOString().split('T')[0],
          inline: true
        },
        {
          name: "Katılımcılar",
          value: runData.participants?.length || 0,
          inline: true
        },
        {
          name: "Toplam Gelir",
          value: `${runData.totalRevenue || 0} coin`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Mention ekleme
    let content = '';
    if (mentionEnabled && userId) {
      content = `<@${userId}> yeni boss run kaydı oluşturuldu!`;
    }

    const payload = {
      content: content,
      embeds: [embed],
      username: username || 'RO Tracker Bot'
    };

    // Discord webhookuna POST isteği gönder
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Discord webhook gönderim hatası:', response.status, await response.text());
    } else {
      console.log('Discord bildirimi gönderildi:', webhookUrl);
    }
  } catch (error) {
    console.error('Discord webhook gönderim hatası:', error);
  }
};

// Clan boss bildirimi gönderme fonksiyonu
const sendClanBossNotification = async (clanId, runData, memberDiscordSettings) => {
  try {
    // Her bir üye için Discord bildirimi gönder
    for (const setting of memberDiscordSettings) {
      if (setting && setting.discord_webhook_url) {
        // Webhook URL doğrulaması
        if (!validateWebhookUrl(setting.discord_webhook_url)) {
          continue;
        }

        await sendDiscordNotification(
          setting.discord_webhook_url,
          runData,
          setting.discord_username,
          setting.discord_user_id,
          setting.discord_mention_enabled
        );
      }
    }
  } catch (error) {
    console.error('Clan boss bildirimi gönderme hatası:', error);
  }
};

module.exports = {
  getUserDiscordSettings,
  updateUserDiscordSettings,
  sendClanBossRunNotification,
  sendClanBossNotification // Ekledik
};