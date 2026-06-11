import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('mike_token');
      const savedUser = localStorage.getItem('mike_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const { data } = await authAPI.getMe();
          setUser(data.user);
          localStorage.setItem('mike_user', JSON.stringify(data.user));
          connectSocket(token);

          const savedTheme = data.user.settings?.theme || 'dark';
          setTheme(savedTheme);
          document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : '');
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('mike_token', data.token);
    localStorage.setItem('mike_user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);

    const savedTheme = data.user.settings?.theme || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : '');

    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('mike_token', data.token);
    localStorage.setItem('mike_user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mike_token');
    localStorage.removeItem('mike_user');
    disconnectSocket();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('mike_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
  }, [theme]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
