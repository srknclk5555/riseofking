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

// --- Eşya Servisi (Hata Veren Kısım Buydu) ---
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
  },
  getItemById: async (id) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/items/${id}`, { headers });
      return await response.json();
    } catch (error) {
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
  },
  getClanMembers: async (clanId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/clans/${clanId}/members`, { headers });
      return await response.json();
    } catch (error) {
      throw error;
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
      if (!response.ok) throw new Error(data?.message || 'Profil hatası');
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