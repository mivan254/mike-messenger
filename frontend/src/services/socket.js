import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitTypingStart = (chatId) => socket?.emit('typing_start', { chatId });
export const emitTypingStop = (chatId) => socket?.emit('typing_stop', { chatId });
export const emitJoinChat = (chatId) => socket?.emit('join_chat', { chatId });
export const emitMessageSeen = (messageId, chatId) => socket?.emit('message_seen', { messageId, chatId });

export const sendMessage = (data) =>
  new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Not connected'));
    socket.emit('send_message', data, (res) => {
      if (res?.error) reject(new Error(res.error));
      else resolve(res);
    });
  });

export const editMessage = (messageId, content, chatId) =>
  new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Not connected'));
    socket.emit('edit_message', { messageId, content, chatId }, (res) => {
      if (res?.error) reject(new Error(res.error));
      else resolve(res);
    });
  });

export const deleteMessage = (messageId, chatId) =>
  new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Not connected'));
    socket.emit('delete_message', { messageId, chatId }, (res) => {
      if (res?.error) reject(new Error(res.error));
      else resolve(res);
    });
  });
