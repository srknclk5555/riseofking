// Production Backend URL
const API_BASE = 'https://riseofking2.onrender.com/api';

// Yeni JWT Sistemine Uygun Header Oluşturucu
const getAuthHeaders = () => {
  // Yeni sistemde token 'token' anahtarıyla localStorage'da tutuluyor
  const token = localStorage.getItem('token'); 
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Genel Fetch Yardımcısı (Kod tekrarını önlemek için)
const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `HTTP Error: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
};

// --- ITEM SERVİSİ ---
export const itemService = {
  getAllItems: () => request('/items'),
  getItemById: (id) => request(`/items/${id}`),
  createItem: (data) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' })
};

// --- LOCATIONS SERVİSİ ---
export const locationService = {
  getAllLocations: () => request('/locations'),
  getLocationById: (id) => request(`/locations/${id}`),
  createLocation: (data) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id, data) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id) => request(`/locations/${id}`, { method: 'DELETE' })
};

// --- CLAN SERVİSİ ---
export const clanService = {
  getAllClans: () => request('/clans'),
  getUserClans: (userId) => request(`/clans/user/${userId}`),
  createClan: (data) => request('/clans', { method: 'POST', body: JSON.stringify(data) }),
  getClanDetails: (id) => request(`/clans/${id}`),
  getClanMembers: (id) => request(`/clans/${id}/members`),
  addMembersToClan: (id, userIds) => request(`/clans/${id}/members`, { method: 'POST', body: JSON.stringify({ userIds }) }),
  removeMemberFromClan: (id, userId) => request(`/clans/${id}/members/${userId}`, { method: 'DELETE' }),
  applyToClan: (id) => request(`/clans/${id}/applications`, { method: 'POST' }),
  updateClan: (id, data) => request(`/clans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClan: (id) => request(`/clans/${id}`, { method: 'DELETE' }),
  getAvailableUsers: () => request('/clans/users/available-for-clan')
};

// --- MOBS SERVİSİ ---
export const mobService = {
  getAllMobs: () => request('/mobs'),
  getMobById: (id) => request(`/mobs/${id}`),
  createMob: (data) => request('/mobs', { method: 'POST', body: JSON.stringify(data) }),
  updateMob: (id, data) => request(`/mobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMob: (id) => request(`/mobs/${id}`, { method: 'DELETE' })
};

// --- FARMS SERVİSİ ---
export const farmService = {
  getAllFarms: () => request('/farms'),
  getFarmById: (id) => request(`/farms/${id}`),
  createFarm: (data) => request('/farms', { method: 'POST', body: JSON.stringify(data) }),
  updateFarm: (id, data) => request(`/farms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFarm: (id) => request(`/farms/${id}`, { method: 'DELETE' }),
  getUserFarms: (userId) => request(`/farms/user/${userId}`)
};

// --- GATHERING SERVİSİ ---
export const gatheringService = {
  getAllLogs: (userId, params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/gathering/user/${userId}${qs ? '?' + qs : ''}`);
  },
  getLogsByDate: (userId, date, params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/gathering/user/${userId}/date/${date}${qs ? '?' + qs : ''}`);
  },
  createLog: (userId, data) => request(`/gathering/user/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateLog: (id, data) => request(`/gathering/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLog: (id) => request(`/gathering/${id}`, { method: 'DELETE' }),
  getDuration: (userId, date, prof) => request(`/gathering/user/${userId}/date/${date}/profession/${prof}/duration`),
  updateDuration: (userId, date, prof, duration) => request(`/gathering/user/${userId}/date/${date}/profession/${prof}/duration`, { method: 'PUT', body: JSON.stringify({ duration }) })
};

// --- MESSAGES SERVİSİ ---
export const messageService = {
  getAllMessages: (userId) => request(`/messages/user/${userId}`),
  getConversation: (userId, contactId) => request(`/messages/conversation/${userId}/${contactId}`),
  createMessage: (userId, data) => request(`/messages/user/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
  markAsRead: (id, userId) => request(`/messages/${id}/read`, { method: 'PUT', body: JSON.stringify({ userId }) }),
  getUnreadCount: (userId) => request(`/messages/unread-count/${userId}`),
  deleteMessage: (id, userId) => request(`/messages/${id}`, { method: 'DELETE', body: JSON.stringify({ userId }) }),
  blockUser: (userId, blockId) => request(`/messages/block/${userId}`, { method: 'POST', body: JSON.stringify({ blockId }) }),
  unblockUser: (userId, blockId) => request(`/messages/unblock/${userId}/${blockId}`, { method: 'DELETE' }),
  getBlockedUsers: (userId) => request(`/messages/blocked/${userId}`)
};

// --- EVENTS SERVİSİ ---
export const eventService = {
  getAllLogs: (userId, params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events/user/${userId}${qs ? '?' + qs : ''}`);
  },
  getLogsByDate: (userId, date, params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events/user/${userId}/date/${date}${qs ? '?' + qs : ''}`);
  },
  createLog: (userId, data) => request(`/events/user/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateLog: (id, data) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLog: (id) => request(`/events/${id}`, { method: 'DELETE' }),
  getDuration: (userId, date, type) => request(`/events/user/${userId}/date/${date}/event/${type}/duration`),
  updateDuration: (userId, date, type, duration) => request(`/events/user/${userId}/date/${date}/event/${type}/duration`, { method: 'PUT', body: JSON.stringify({ duration }) })
};

// --- NOTIFICATIONS SERVİSİ ---
export const notificationService = {
  getAllNotifications: () => request('/notifications'),
  getUserNotifications: (userId, params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications/user/${userId}${qs ? '?' + qs : ''}`);
  },
  createNotification: (data) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  getUnreadCount: (userId) => request(`/notifications/unread-count/${userId}`),
  markAllAsRead: (userId) => request(`/notifications/mark-all-read/${userId}`, { method: 'POST' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' })
};

// --- USER SERVİSİ ---
export const userService = {
  getProfile: (uid) => request(`/users/profile/${uid}`),
  updateProfile: (uid, data) => request(`/users/profile/${uid}`, { method: 'PUT', body: JSON.stringify(data) }),
  addFriend: (uid, data) => request(`/users/friends/${uid}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteFriend: (uid, key) => request(`/users/friends/${uid}/${key}`, { method: 'DELETE' }),
  linkFriend: (uid, key, tUid, tName) => request(`/users/friends/${uid}/link/${key}`, { method: 'POST', body: JSON.stringify({ targetUid: tUid, targetUsername: tName }) }),
  findUserByUsername: (username) => request(`/users/find/${username}`)
};

// --- DISCORD SERVİSİ ---
export const discordService = {
  getUserDiscordSettings: (uid) => request(`/discord/settings/${uid}`),
  updateUserDiscordSettings: (data) => request(`/discord/settings/${data.user_id}`, { method: 'PUT', body: JSON.stringify(data) })
};