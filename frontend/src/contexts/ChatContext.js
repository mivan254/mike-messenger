import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { chatsAPI } from '../services/api';
import { getSocket, emitJoinChat } from '../services/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingChats, setLoadingChats] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const socketRef = useRef(null);

  // Fetch user's chats
  const fetchChats = useCallback(async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const { data } = await chatsAPI.getChats();
      setChats(data.chats);
    } catch (err) {
      console.error('fetchChats error:', err);
    }
    setLoadingChats(false);
  }, [user]);

  // Fetch messages for a chat
  const fetchMessages = useCallback(async (chatId, page = 1) => {
    try {
      const { data } = await chatsAPI.getMessages(chatId, page);
      if (page === 1) {
        setMessages((prev) => ({ ...prev, [chatId]: data.messages }));
      } else {
        setMessages((prev) => ({ ...prev, [chatId]: [...data.messages, ...(prev[chatId] || [])] }));
      }
      return data.pagination;
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  }, []);

  // Open a chat
  const openChat = useCallback(
    async (chat) => {
      setActiveChat(chat);
      emitJoinChat(chat._id);
      if (!messages[chat._id]) {
        await fetchMessages(chat._id);
      }
    },
    [fetchMessages, messages]
  );

  // Add message locally (from socket)
  const addMessage = useCallback((chatId, message) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message],
    }));
    // Update chat lastMessage preview
    setChats((prev) =>
      prev.map((c) =>
        c._id === chatId
          ? { ...c, lastMessage: message, lastActivity: message.createdAt }
          : c
      ).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
    );
  }, []);

  // Update a message (edit/delete/reaction)
  const updateMessage = useCallback((chatId, messageId, updates) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m._id === messageId ? { ...m, ...updates } : m
      ),
    }));
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.on('receive_message', ({ message, chatId }) => {
      addMessage(chatId, message);
    });

    socket.on('typing_indicator', ({ userId, chatId, isTyping }) => {
      setTypingUsers((prev) => {
        const chatTypers = prev[chatId] || new Set();
        const updated = new Set(chatTypers);
        if (isTyping) updated.add(userId);
        else updated.delete(userId);
        return { ...prev, [chatId]: updated };
      });
    });

    socket.on('user_status_change', ({ userId, isOnline, lastSeen }) => {
      setOnlineStatuses((prev) => ({ ...prev, [userId]: { isOnline, lastSeen } }));
    });

    socket.on('message_edited', ({ messageId, content, chatId }) => {
      updateMessage(chatId, messageId, { content, isEdited: true });
    });

    socket.on('message_deleted', ({ messageId, chatId }) => {
      updateMessage(chatId, messageId, { isDeleted: true, content: 'This message was deleted' });
    });

    socket.on('message_seen_update', ({ messageId, seenBy, chatId }) => {
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((m) =>
          m._id === messageId
            ? { ...m, seenBy: [...(m.seenBy || []), { user: seenBy }] }
            : m
        ),
      }));
    });

    socket.on('reaction_updated', ({ messageId, reactions, chatId }) => {
      updateMessage(chatId, messageId, { reactions });
    });

    return () => {
      socket.off('receive_message');
      socket.off('typing_indicator');
      socket.off('user_status_change');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_seen_update');
      socket.off('reaction_updated');
    };
  }, [user, addMessage, updateMessage]);

  useEffect(() => {
    if (user) fetchChats();
  }, [user, fetchChats]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        activeChat,
        setActiveChat,
        messages,
        loadingChats,
        typingUsers,
        onlineStatuses,
        fetchChats,
        fetchMessages,
        openChat,
        addMessage,
        updateMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
