import { auth } from './firebase-config'; // Firebase config dosyanızın yolu

const API_BASE = 'https://riseofking2.onrender.com/api';

// Firebase'den token al
const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    const user = auth.currentUser;
    if (user) {
      // Firebase'den fresh token al
      const token = await user.getIdToken(true); // true = force refresh
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Token alma hatası:', error);
  }
  
  return headers;
};

// Örnek: userService.getProfile güncelleme
export const userService = {
  getProfile: async (uid) => {
    try {
      const headers = await getAuthHeaders(); // ASYNC olarak çağır
      const response = await fetch(`${API_BASE}/users/profile/${uid}`, {
        headers
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (error) {
      console.error('Profil getirme hatası:', error);
      throw error;
    }
  },

  updateProfile: async (uid, profileData) => {
    try {
      const headers = await getAuthHeaders(); // ASYNC
      const response = await fetch(`${API_BASE}/users/profile/${uid}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      throw error;
    }
  }
};

// messageService için de aynı şekilde
export const messageService = {
  getAllMessages: async (userId) => {
    try {
      const headers = await getAuthHeaders(); // ASYNC
      const response = await fetch(`${API_BASE}/messages/user/${userId}`, {
        headers
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Messages getirme hatası:', error);
      throw error;
    }
  },
  
  // Diğer metodlar da aynı şekilde...
};
