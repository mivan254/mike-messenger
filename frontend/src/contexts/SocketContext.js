import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user || !user._id) return;
    const token = localStorage.getItem('mike_token');
    if (!token) return;

    let s;
    try {
      const { initSocket } = require('../services/socket');
      s = initSocket(token);
      setSocket(s);
    } catch (err) {
      console.error('Socket init error:', err);
    }

    return () => {
      try {
        const { disconnectSocket } = require('../services/socket');
        disconnectSocket();
      } catch {}
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;