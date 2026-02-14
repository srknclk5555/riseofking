import { API_BASE } from './apiConfig';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const clanService = {
  // Tüm klanları getir
  getAllClans: async () => {
    try {
      const response = await fetch(`${API_BASE}/clans`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Clans getirme hatası:', error);
      throw error;
    }
  },

  // Kullanıcının klanlarını getir
  getUserClans: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/clans/user/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcı klanları getirme hatası:', error);
      throw error;
    }
  },

  // Yeni klan oluştur
  createClan: async (clanData) => {
    try {
      const response = await fetch(`${API_BASE}/clans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(clanData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan oluşturma hatası:', error);
      throw error;
    }
  },

  // Klan detaylarını getir
  getClanDetails: async (clanId) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan detayları getirme hatası:', error);
      throw error;
    }
  },

  // Klan üyelerini getir
  getClanMembers: async (clanId) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}/members`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan üyeleri getirme hatası:', error);
      throw error;
    }
  },

  // Kullanıcı ekle
  addMembersToClan: async (clanId, userIds) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcı ekleme hatası:', error);
      throw error;
    }
  },

  // Kullanıcı çıkar
  removeMemberFromClan: async (clanId, userId) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}/member/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcı çıkarma hatası:', error);
      throw error;
    }
  },

  // Klana başvur
  applyToClan: async (clanId) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}/applications`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klana başvuru hatası:', error);
      throw error;
    }
  },

  // Klanı güncelle
  updateClan: async (clanId, clanData) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(clanData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan güncelleme hatası:', error);
      throw error;
    }
  },

  // Klanı sil
  deleteClan: async (clanId) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan silme hatası:', error);
      throw error;
    }
  },

  // Kullanıcıları getir (klana eklenebilecek)
  getAvailableUsers: async () => {
    try {
      const response = await fetch(`${API_BASE}/clans/users/available-for-clan`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcılar getirme hatası:', error);
      throw error;
    }
  },

  // Klan mesajlarını getir
  getClanMessages: async (clanId, filters = {}) => {
    try {
      const { text, sender, startDate, endDate } = filters;
      let url = `${API_BASE}/clans/${clanId}/messages?`;
      if (text) url += `text=${encodeURIComponent(text)}&`;
      if (sender) url += `sender=${encodeURIComponent(sender)}&`;
      if (startDate) url += `startDate=${encodeURIComponent(startDate)}&`;
      if (endDate) url += `endDate=${encodeURIComponent(endDate)}&`;

      // Sondaki ? veya & işaretini temizleyelim
      const cleanUrl = url.endsWith('?') ? url.slice(0, -1) : (url.endsWith('&') ? url.slice(0, -1) : url);

      const response = await fetch(cleanUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mesaj getirme hatası:', error);
      throw error;
    }
  },

  // Klan mesajı gönder
  sendClanMessage: async (clanId, text) => {
    try {
      const response = await fetch(`${API_BASE}/clans/${clanId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      throw error;
    }
  },

  // Klan boss runlarini getir
  getClanBossRuns: async (clanId) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/clan/${clanId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan boss runlari getirme hatasi:', error);
      throw error;
    }
  },

  // Klan boss run detaylarini getir
  getClanBossRunDetails: async (runId) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/${runId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan boss run detaylari getirme hatasi:', error);
      throw error;
    }
  },

  // Tek bir boss run getir (detaylı)
  getClanBossRunById: async (runId) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/${runId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Boss run getirme hatasi:', error);
      throw error;
    }
  },

  // Yeni klan boss run olustur
  createClanBossRun: async (clanId, runData) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clanId,
          runDate: runData.date,
          participants: runData.participants,
          drops: runData.drops
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan boss run olusturma hatasi:', error);
      throw error;
    }
  },

  // Katilimci odeme durumunu guncelle
  updateParticipantPayStatus: async (runId, participantUserId, isPaid) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/${runId}/participants/${participantUserId}/pay`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPaid }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Odeme durumu guncelleme hatasi:', error);
      throw error;
    }
  },

  // Kayittan kendini cikar
  removeSelfFromRun: async (runId) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/${runId}/self`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kayittan ayrilma hatasi:', error);
      throw error;
    }
  },

  // Kayittan baska bir kullaniciyi cikar
  removeParticipantFromRun: async (runId, participantUserId) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/${runId}/participants/${participantUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Handle different response types (JSON vs HTML)
        const contentType = response.headers.get('content-type');
        let errorData;

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          // If response is not JSON (probably HTML error page), create a generic error
          errorData = { error: `HTTP error! status: ${response.status}` };
        }

        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Katilimciyi kayittan cikarma hatasi:', error);
      throw error;
    }
  },

  // Klan boss run sil
  deleteClanBossRun: async (runId) => {
    try {
      const response = await fetch(`${API_BASE}/clan-boss/runs/${runId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Klan boss run silme hatasi:', error);
      throw error;
    }
  }
};