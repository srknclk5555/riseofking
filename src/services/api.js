const API_BASE = 'https://riseofking2.onrender.com/api';

// Yeni sistem: LocalStorage'daki JWT token'ı kullan
const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    const token = localStorage.getItem('token'); 
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Token alma hatası:', error);
  }
  
  return headers;
};

// --- Bildirim Servisi (Netlify'ın istediği parça) ---
export const notificationService = {
  getNotifications: async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/notifications/user/${userId}`, { headers });
      return await response.json();
    } catch (error) {
      console.error('Bildirim hatası:', error);
      return [];
    }
  },
  markAsRead: async (notificationId) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/notifications/${notificationId}/read`, { method: 'PUT', headers });
    } catch (error) {
      console.error('Bildirim okundu hatası:', error);
    }
  }
};

// --- Eşya Servisi ---
export const itemService = {
  getAllItems: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/items`, { headers });
      if (!response.ok) throw new Error('Eşyalar alınamadı');
      return await response.json();
    } catch (error) {
      console.error('Item listesi hatası:', error);
      throw error;
    }
  }
};

// --- Klan Servisi ---
export const clanService = {
  getClanDetails: async (clanId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/clans/${clanId}`, { headers });
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

// --- Arkadaşlık Servisi ---
export const friendshipService = {
  getFriends: async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/friendships/${userId}`, { headers });
      return await response.json();
    } catch (error) {
      console.error('Arkadaş listesi hatası:', error);
      return [];
    }
  }
};

// --- Kullanıcı Servisi ---
export const userService = {
  getProfile: async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/profile/${userId}`, { headers });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (error) {
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
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

// --- Mesaj Servisi ---
export const messageService = {
  getAllMessages: async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/messages/user/${userId}`, { headers });
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};