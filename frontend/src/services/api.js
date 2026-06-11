import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mike_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mike_token');
      localStorage.removeItem('mike_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Users ──────────────────────────────────
export const usersAPI = {
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getUser: (id) => api.get(`/users/${id}`),
  blockUser: (id) => api.post(`/users/block/${id}`),
  reportUser: (id, reason) => api.post(`/users/report/${id}`, { reason }),
  setChatLockPin: (pin) => api.put('/users/chat-lock', { pin }),
  verifyLockPin: (pin) => api.post('/users/verify-lock-pin', { pin }),
};

// ─── Chats ──────────────────────────────────
export const chatsAPI = {
  getChats: (showLocked = false) => api.get(`/chats?showLocked=${showLocked}`),
  createChat: (userId) => api.post('/chats', { userId }),
  createGroup: (data) => api.post('/chats/group', data),
  getMessages: (chatId, page = 1) => api.get(`/chats/${chatId}/messages?page=${page}&limit=50`),
  lockChat: (chatId) => api.put(`/chats/${chatId}/lock`),
  deleteChat: (chatId) => api.delete(`/chats/${chatId}`),
};

// ─── Messages ────────────────────────────────
export const messagesAPI = {
  editMessage: (id, content) => api.put(`/messages/${id}`, { content }),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  reactToMessage: (id, emoji) => api.post(`/messages/${id}/react`, { emoji }),
  markSeen: (id) => api.post(`/messages/${id}/seen`),
  getOriginal: (id) => api.get(`/messages/${id}/original`),
};

// ─── Upload ──────────────────────────────────
export const uploadAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
};

export default api;
