// Firebase importu TAMAMEN kaldırıldı
const API_BASE = 'https://riseofking2.onrender.com/api';

// Yeni sistem: LocalStorage'daki JWT token'ı kullan
const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    // Yeni sistemde token localStorage'da saklanıyor
    const token = localStorage.getItem('token'); 
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Token alma hatası:', error);
  }
  
  return headers;
};

// Kullanıcı Servisi
export const userService = {
  getProfile: async (userId) => { // Artık uid yerine userId veya genel id kullanabilirsin
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/profile/${userId}`, {
        headers
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `Sunucu hatası: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error('Profil getirme hatası:', error);
      throw error;
    }
  },

  updateProfile: async (userId, profileData) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/profile/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Güncelleme başarısız');
      }
      return data;
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      throw error;
    }
  }
};

// Mesaj Servisi
export const messageService = {
  getAllMessages: async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/messages/user/${userId}`, {
        headers
      });
      if (!response.ok) {
        throw new Error(`Mesajlar alınamadı: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Messages getirme hatası:', error);
      throw error;
    }
  }
};