import React, { useState, useEffect } from 'react';
import { discordService } from '../services/api';

const DiscordSettings = ({ uid, showNotification }) => {
  const [discordSettings, setDiscordSettings] = useState({
    user_id: uid,
    discord_webhook_url: '',
    discord_username: '',
    discord_user_id: '',
    discord_mention_enabled: false
  });
  const [loading, setLoading] = useState(true);

  // Kullanıcının Discord ayarlarını yükle
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await discordService.getUserDiscordSettings(uid);
        setDiscordSettings(prev => ({
          ...prev,
          ...settings
        }));
      } catch (error) {
        console.error('Discord ayarları yüklenirken hata oluştu:', error);
        // Hata durumunda kullanıcıya bilgi ver
        showNotification('Discord ayarları yüklenemedi.', 'warning');
      } finally {
        setLoading(false);
      }
    };
    
    if (uid) {
      loadSettings();
    }
  }, [uid]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDiscordSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await discordService.updateUserDiscordSettings(discordSettings);
      showNotification('Discord ayarları başarıyla güncellendi!', 'success');
    } catch (error) {
      console.error('Discord ayarları güncellenirken hata oluştu:', error);
      showNotification('Discord ayarları güncellenemedi: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="animate-pulse text-gray-400">Ayarlar yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-white font-bold mb-4">Discord Entegrasyonu</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Discord Webhook URL
          </label>
          <input
            type="url"
            name="discord_webhook_url"
            value={discordSettings.discord_webhook_url}
            onChange={handleChange}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Clan boss kayıtlarında bildirim almak için webhook URL'nizi girin
          </p>
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Discord Kullanıcı Adı
          </label>
          <input
            type="text"
            name="discord_username"
            value={discordSettings.discord_username}
            onChange={handleChange}
            placeholder="Kullanıcı adınızı girin"
            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Discord kullanıcı adınız (opsiyonel)
          </p>
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Discord User ID
          </label>
          <input
            type="text"
            name="discord_user_id"
            value={discordSettings.discord_user_id}
            onChange={handleChange}
            placeholder="Discord kullanıcı ID'nizi girin"
            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Discord kullanıcı ID'niz (etiketleme için gerekli)
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="discord_mention_enabled"
            checked={discordSettings.discord_mention_enabled}
            onChange={handleChange}
            className="mr-2"
          />
          <label className="text-gray-300 text-sm">
            Bildirimlerde etiketleme (mention) kullan
          </label>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition"
          >
            Ayarları Kaydet
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <h4 className="text-yellow-500 font-bold mb-2">Nasıl Kurulur?</h4>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Discord sunucunuzda bir kanal oluşturun</li>
          <li>Kanal ayarlarına gidin ve "Webhooks" seçeneğine tıklayın</li>
          <li>"Webhook Oluştur" butonuna tıklayın</li>
          <li>Oluşturulan webhook'un URL'sini kopyalayın</li>
          <li>URL'yi yukarıdaki alana yapıştırın</li>
          <li>Opsiyonel olarak kullanıcı adı ve ID'nizi girin</li>
          <li>"Ayarları Kaydet" butonuna tıklayın</li>
        </ol>
      </div>
    </div>
  );
};

export default DiscordSettings;