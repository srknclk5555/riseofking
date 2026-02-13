// Frontend için API servis örneği
const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const itemService = {
  // Tüm item'ları getir
  getAllItems: async () => {
    try {
      const response = await fetch(`${API_BASE}/items`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Items getirme hatası:', error);
      throw error;
    }
  },

  // Belirli bir item'ı getir
  getItemById: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Item getirme hatası:', error);
      throw error;
    }
  },

  // Yeni item ekle
  createItem: async (itemData) => {
    try {
      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Item ekleme hatası:', error);
      throw error;
    }
  },

  // Item güncelle
  updateItem: async (id, itemData) => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Item güncelleme hatası:', error);
      throw error;
    }
  },

  // Item sil
  deleteItem: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Item silme hatası:', error);
      throw error;
    }
  }
};

// Locations servisi
export const locationService = {
  // Tüm location'ları getir
  getAllLocations: async () => {
    try {
      const response = await fetch(`${API_BASE}/locations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Locations getirme hatası:', error);
      throw error;
    }
  },

  // Belirli bir location'ı getir
  getLocationById: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/locations/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Location getirme hatası:', error);
      throw error;
    }
  },

  // Yeni location ekle
  createLocation: async (locationData) => {
    try {
      const response = await fetch(`${API_BASE}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Location ekleme hatası:', error);
      throw error;
    }
  },

  // Location güncelle
  updateLocation: async (id, locationData) => {
    try {
      const response = await fetch(`${API_BASE}/locations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Location güncelleme hatası:', error);
      throw error;
    }
  },

  // Location sil
  deleteLocation: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/locations/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Location silme hatası:', error);
      throw error;
    }
  }
};

// Mobs servisi
// Clan servisi
export const clanService = {
  // Tüm klanları getir
  getAllClans: async () => {
    try {
      const response = await fetch(`${API_BASE}/clans`);
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
      const response = await fetch(`${API_BASE}/clans/user/${userId}`);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clanData)
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
      const response = await fetch(`${API_BASE}/clans/${clanId}`);
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
      const response = await fetch(`${API_BASE}/clans/${clanId}/members`);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds })
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
      const response = await fetch(`${API_BASE}/clans/${clanId}/members/${userId}`, {
        method: 'DELETE'
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
        method: 'POST'
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clanData)
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
        method: 'DELETE'
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
      const response = await fetch(`${API_BASE}/clans/users/available-for-clan`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcılar getirme hatası:', error);
      throw error;
    }
  }
};

export const mobService = {
  // Tüm mob'ları getir
  getAllMobs: async () => {
    try {
      const response = await fetch(`${API_BASE}/mobs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mobs getirme hatası:', error);
      throw error;
    }
  },

  // Belirli bir mob'ı getir
  getMobById: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/mobs/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mob getirme hatası:', error);
      throw error;
    }
  },

  // Yeni mob ekle
  createMob: async (mobData) => {
    try {
      const response = await fetch(`${API_BASE}/mobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mobData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mob ekleme hatası:', error);
      throw error;
    }
  },

  // Mob güncelle
  updateMob: async (id, mobData) => {
    try {
      const response = await fetch(`${API_BASE}/mobs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mobData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mob güncelleme hatası:', error);
      throw error;
    }
  },

  // Mob sil
  deleteMob: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/mobs/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Mob silme hatası:', error);
      throw error;
    }
  }
};

// Farms servisi
export const farmService = {
  // Tüm farm'ları getir
  getAllFarms: async () => {
    try {
      const response = await fetch(`${API_BASE}/farms`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Farms getirme hatası:', error);
      throw error;
    }
  },

  // Belirli bir farm'ı getir
  getFarmById: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/farms/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Farm getirme hatası:', error);
      throw error;
    }
  },

  // Yeni farm ekle
  createFarm: async (farmData) => {
    try {
      const response = await fetch(`${API_BASE}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farmData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Farm ekleme hatası:', error);
      throw error;
    }
  },

  // Farm güncelle
  updateFarm: async (id, farmData) => {
    try {
      const response = await fetch(`${API_BASE}/farms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farmData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Farm güncelleme hatası:', error);
      throw error;
    }
  },

  // Farm sil
  deleteFarm: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/farms/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Farm silme hatası:', error);
      throw error;
    }
  },

  // Kullanıcının farm'larını getir
  getUserFarms: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/farms/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcı farms getirme hatası:', error);
      throw error;
    }
  }
};

// Gathering logs servisi
export const gatheringService = {
  // Tüm toplama loglarını getir
  getAllLogs: async (userId, options = {}) => {
    try {
      const { date, profession } = options;
      let url = `${API_BASE}/gathering/user/${userId}`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (profession) params.append('profession', profession);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering logs getirme hatası:', error);
      throw error;
    }
  },

  // Belirli tarih için toplama loglarını getir
  getLogsByDate: async (userId, date, options = {}) => {
    try {
      const { profession } = options;
      let url = `${API_BASE}/gathering/user/${userId}/date/${date}`;
      if (profession) url += `?profession=${profession}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering logs by date getirme hatası:', error);
      throw error;
    }
  },

  // Yeni toplama logu oluştur
  createLog: async (userId, logData) => {
    try {
      const response = await fetch(`${API_BASE}/gathering/user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering log ekleme hatası:', error);
      throw error;
    }
  },

  // Toplama logunu güncelle
  updateLog: async (id, logData) => {
    try {
      const response = await fetch(`${API_BASE}/gathering/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering log güncelleme hatası:', error);
      throw error;
    }
  },

  // Toplama logunu sil
  deleteLog: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/gathering/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering log silme hatası:', error);
      throw error;
    }
  },

  // Belirli profesyon için süre getir
  getDuration: async (userId, date, profession) => {
    try {
      const response = await fetch(`${API_BASE}/gathering/user/${userId}/date/${date}/profession/${profession}/duration`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering duration getirme hatası:', error);
      throw error;
    }
  },

  // Profesyon süresini güncelle
  updateDuration: async (userId, date, profession, duration) => {
    try {
      const response = await fetch(`${API_BASE}/gathering/user/${userId}/date/${date}/profession/${profession}/duration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Gathering duration güncelleme hatası:', error);
      throw error;
    }
  }
};

// Messages servisi
export const messageService = {
  // Kullanıcının tüm mesajlarını getir
  getAllMessages: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/user/${userId}`, {
        headers: getAuthHeaders()
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

  // İki kullanıcı arasındaki mesajları getir
  getConversation: async (userId, contactId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/conversation/${userId}/${contactId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Conversation getirme hatası:', error);
      throw error;
    }
  },

  // Yeni mesaj oluştur
  createMessage: async (userId, messageData) => {
    try {
      const response = await fetch(`${API_BASE}/messages/user/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(), // Content-Type zaten içinde var
        body: JSON.stringify(messageData)
      });
      if (!response.ok) {
        // Hata detayını yakala (örn: engellenmiş kullanıcı)
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.res = response; // Status code kontrolü için
        error.data = errorData;
        throw error;
      }
      return await response.json();
    } catch (error) {
      console.error('Message gönderme hatası:', error);
      throw error;
    }
  },

  // Mesajı okundu olarak işaretle
  markAsRead: async (id, userId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Message okundu olarak işaretleme hatası:', error);
      throw error;
    }
  },

  // Kullanıcının okunmamış mesaj sayısını getir
  getUnreadCount: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/unread-count/${userId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Okunmamış mesaj sayısı getirme hatası:', error);
      throw error;
    }
  },

  // Belirli bir kullanıcıdan gelen okunmamış mesajları getir
  getUnreadMessages: async (userId, senderId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/unread/${userId}/from/${senderId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Okunmamış mesajlar getirme hatası:', error);
      throw error;
    }
  },

  // Mesaj sil
  deleteMessage: async (id, userId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }) // DELETE body standard dışı olabilir ama backend bakıyor
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Message silme hatası:', error);
      throw error;
    }
  },

  // Kullanıcı engelle
  blockUser: async (userId, blockId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/block/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ blockId })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Block hatası:', error);
      throw error;
    }
  },

  // Kullanıcı engelini kaldır
  unblockUser: async (userId, blockId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/unblock/${userId}/${blockId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Unblock hatası:', error);
      throw error;
    }
  },

  // Engellenen kullanıcıları getir
  getBlockedUsers: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/messages/blocked/${userId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Engellenen kullanıcılar getirme hatası:', error);
      throw error;
    }
  }
};


// Events logs servisi
export const eventService = {
  // Tüm etkinlik loglarını getir
  getAllLogs: async (userId, options = {}) => {
    try {
      const { date, eventType } = options;
      let url = `${API_BASE}/events/user/${userId}`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (eventType) params.append('eventType', eventType);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Events logs getirme hatası:', error);
      throw error;
    }
  },

  // Belirli tarih için etkinlik loglarını getir
  getLogsByDate: async (userId, date, options = {}) => {
    try {
      const { eventType } = options;
      let url = `${API_BASE}/events/user/${userId}/date/${date}`;
      if (eventType) url += `?eventType=${eventType}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Events logs by date getirme hatası:', error);
      throw error;
    }
  },

  // Yeni etkinlik logu oluştur
  createLog: async (userId, logData) => {
    try {
      const response = await fetch(`${API_BASE}/events/user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Event log ekleme hatası:', error);
      throw error;
    }
  },

  // Etkinlik logunu güncelle
  updateLog: async (id, logData) => {
    try {
      const response = await fetch(`${API_BASE}/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Event log güncelleme hatası:', error);
      throw error;
    }
  },

  // Etkinlik logunu sil
  deleteLog: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/events/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Event log silme hatası:', error);
      throw error;
    }
  },

  // Belirli etkinlik için süre getir
  getDuration: async (userId, date, eventType) => {
    try {
      const response = await fetch(`${API_BASE}/events/user/${userId}/date/${date}/event/${eventType}/duration`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Event duration getirme hatası:', error);
      throw error;
    }
  },

  // Etkinlik süresini güncelle
  updateDuration: async (userId, date, eventType, duration) => {
    try {
      const response = await fetch(`${API_BASE}/events/user/${userId}/date/${date}/event/${eventType}/duration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Event duration güncelleme hatası:', error);
      throw error;
    }
  }
};

// Notifications servisi
export const notificationService = {
  // Tüm bildirimleri getir
  getAllNotifications: async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Notifications getirme hatası:', error);
      throw error;
    }
  },

  // Kullanıcının bildirimlerini getir
  getUserNotifications: async (userId, options = {}) => {
    try {
      const { limit = 50, offset = 0, read } = options;
      let url = `${API_BASE}/notifications/user/${userId}?limit=${limit}&offset=${offset}`;
      if (read !== undefined) {
        url += `&read=${read}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcı notifications getirme hatası:', error);
      throw error;
    }
  },

  // Yeni bildirim ekle
  createNotification: async (notificationData) => {
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Notification ekleme hatası:', error);
      throw error;
    }
  },

  // Bildirimi okundu olarak işaretle
  markAsRead: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Notification okundu olarak işaretleme hatası:', error);
      throw error;
    }
  },

  // Kullanıcının okunmamış bildirim sayısını getir
  getUnreadCount: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/unread-count/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Okunmamış notification sayısı getirme hatası:', error);
      throw error;
    }
  },

  // Kullanıcının tüm bildirimlerini okundu olarak işaretle
  markAllAsRead: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/mark-all-read/${userId}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Tüm notifications okundu olarak işaretleme hatası:', error);
      throw error;
    }
  },

  // Bildirim sil
  deleteNotification: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Notification silme hatası:', error);
      throw error;
    }
  }
};

// Test fonksiyonu
export const testApiConnection = async () => {
  try {
    console.log('🧪 API bağlantısı test ediliyor...');
    const items = await itemService.getAllItems();
    console.log('✅ Items API bağlantısı başarılı!');

    const locations = await locationService.getAllLocations();
    console.log('✅ Locations API bağlantısı başarılı!');

    const mobs = await mobService.getAllMobs();
    console.log('✅ Mobs API bağlantısı başarılı!');

    const farms = await farmService.getAllFarms();
    console.log('✅ Farms API bağlantısı başarılı!');

    const notifications = await notificationService.getAllNotifications();
    console.log('✅ Notifications API bağlantısı başarılı!');

    const gatheringLogs = await gatheringService.getAllLogs('user123');
    console.log('✅ Gathering API bağlantısı başarılı!');

    const eventLogs = await eventService.getAllLogs('user123');
    console.log('✅ Events API bağlantısı başarılı!');

    const messages = await messageService.getAllMessages('user123');
    console.log('✅ Messages API bağlantısı başarılı!');

    console.log('📋 Gelen veriler:', {
      items: items.length,
      locations: locations.length,
      mobs: mobs.length,
      farms: farms.length,
      notifications: notifications.length,
      gatheringLogs: gatheringLogs.length,
      eventLogs: eventLogs.length,
      messages: messages.length
    });
    return { items, locations, mobs, farms, notifications, gatheringLogs, eventLogs, messages };
  } catch (error) {
    console.error('❌ API bağlantısı başarısız:', error);
    throw error;
  }
};

// User servisi
export const userService = {
  // Kullanıcı profili getirme
  getProfile: async (uid) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/users/profile/${uid}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
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

  // Kullanıcı profili güncelleme
  updateProfile: async (uid, profileData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/users/profile/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
  },

  // Arkadaş ekleme
  addFriend: async (uid, friendData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/users/friends/${uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(friendData)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (error) {
      console.error('Arkadaş ekleme hatası:', error);
      throw error;
    }
  },

  // Arkadaş silme
  deleteFriend: async (uid, friendKey) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/users/friends/${uid}/${friendKey}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (error) {
      console.error('Arkadaş silme hatası:', error);
      throw error;
    }
  },

  // Arkadaş bağlama
  linkFriend: async (uid, friendKey, targetUid, targetUsername) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/users/friends/${uid}/link/${friendKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ targetUid, targetUsername })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (error) {
      console.error('Arkadaş bağlama hatası:', error);
      throw error;
    }
  },

  // Kullanıcı adı ile kullanıcı bulma
  findUserByUsername: async (username) => {
    try {
      const response = await fetch(`${API_BASE}/users/find/${username}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Kullanıcı bulma hatası:', error);
      throw error;
    }
  }
};

// Discord entegrasyon servisi
export const discordService = {
  // Kullanıcının Discord ayarlarını getir
  getUserDiscordSettings: async (uid) => {
    try {
      const response = await fetch(`${API_BASE}/discord/settings/${uid}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Ayar bulunamadıysa varsayılan değerleri döndür
          return {
            user_id: uid,
            discord_webhook_url: '',
            discord_username: '',
            discord_user_id: '',
            discord_mention_enabled: false
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Discord ayarları getirme hatası:', error);
      // Hata durumunda varsayılan değerleri döndür
      return {
        user_id: uid,
        discord_webhook_url: '',
        discord_username: '',
        discord_user_id: '',
        discord_mention_enabled: false
      };
    }
  },

  // Kullanıcının Discord ayarlarını güncelle
  updateUserDiscordSettings: async (settings) => {
    try {
      const response = await fetch(`${API_BASE}/discord/settings/${settings.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Discord ayarları güncelleme hatası:', error);
      throw error;
    }
  }
};

// Kullanım örneği:
// Tüm item'ları getir
itemService.getAllItems()
  .then(items => console.log('Items:', items))
  .catch(error => console.error('Hata:', error));

// Yeni item ekle
const newItem = {
  name: "Yeni Item",
  rarity: "Rare",
  level: 25,
  gear_score: 200,
  class: "Mage",
  bonuses: { intelligence: 15 },
  resistances: { ice: 10 }
};

itemService.createItem(newItem)
  .then(createdItem => console.log('Oluşturulan item:', createdItem))
  .catch(error => console.error('Hata:', error));
