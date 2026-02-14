const rawUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || 'https://riseofking2.onrender.com/api';
export const API_BASE = rawUrl.endsWith('/api') ? rawUrl : (rawUrl.endsWith('/') ? `${rawUrl}api` : `${rawUrl}/api`);
export const SOCKET_URL = API_BASE.replace(/\/api$/, '');