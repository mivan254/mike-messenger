import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { SocketProvider } from './contexts/SocketContext';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Calls from './components/Calls';
import Updates from './components/Updates';
import CallScreen from './components/CallScreen';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { getSocket } from './services/socket';
import './App.css';

const TABS = [
  { id: 'chats',   icon: '💬', label: 'Chats'   },
  { id: 'calls',   icon: '📞', label: 'Calls'   },
  { id: 'updates', icon: '📢', label: 'Updates'  },
];

const AppShell = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab]       = useState('chats');
  const [activeChat, setActiveChat]     = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall]     = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('incoming_call', (data) => setIncomingCall(data));
    socket.on('call_accepted', ({ callId, roomId }) => {
      setActiveCall((prev) =>
        prev && prev._id === callId ? { ...prev, status: 'active', roomId } : prev
      );
    });
    socket.on('call_rejected', ({ callId }) => {
      setActiveCall((prev) => (prev && prev._id === callId ? null : prev));
    });
    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
    };
  }, []);

  const handleStartCall = (otherUser, type = 'audio') => {
    if (!otherUser) return;
    setActiveCall({
      _id: null,
      caller: user,
      recipients: [{ user: otherUser }],
      type,
      roomId: null,
      isOutgoing: true,
    });
  };

  const handleAcceptCall = () => {
    setActiveCall({ ...incomingCall, isOutgoing: false });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    const socket = getSocket();
    if (socket && incomingCall) {
      socket.emit('call_rejected', {
        callId: incomingCall.callId,
        callerId: incomingCall.caller?._id,
      });
    }
    setIncomingCall(null);
  };

  return (
    <div className="app-layout">
      <div className="left-panel">
        <div className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              title={t.label}
            >
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="tab-content">
          {activeTab === 'chats' && (
            <Sidebar activeChat={activeChat} onSelectChat={setActiveChat} />
          )}
          {activeTab === 'calls' && (
            <Calls onStartCall={handleStartCall} />
          )}
          {activeTab === 'updates' && (
            <Updates />
          )}
        </div>
      </div>

      <div className="right-panel">
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            currentUser={user}
            onStartCall={handleStartCall}
          />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-icon">💬</div>
            <h2>MIKE Messenger</h2>
            <p>Select a chat to start messaging</p>
            <div className="welcome-features">
              <span>🔒 End-to-end encrypted</span>
              <span>📞 Voice & video calls</span>
              <span>📢 Status updates</span>
            </div>
          </div>
        )}
      </div>

      {incomingCall && !activeCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <div className="call-type-badge">
              {incomingCall.type === 'video' ? '🎥 Video Call' : '📞 Voice Call'}
            </div>
            <div style={{ fontSize: 56 }}>📳</div>
            <h3>{incomingCall.caller?.displayName || 'Unknown'}</h3>
            <p className="ringing-animation">
              Incoming {incomingCall.type} call...
            </p>
            <div className="incoming-call-actions">
              <button className="reject-btn" onClick={handleRejectCall}>📵</button>
              <button className="accept-btn" onClick={handleAcceptCall}>📞</button>
            </div>
          </div>
        </div>
      )}

      {activeCall && (
        <CallScreen
          call={activeCall}
          currentUser={user}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) return <div className="splash">Loading MIKE...</div>;

  return user ? (
    <SocketProvider>
      <AppShell />
    </SocketProvider>
  ) : showRegister ? (
    <RegisterPage onSwitch={() => setShowRegister(false)} />
  ) : (
    <LoginPage onSwitch={() => setShowRegister(true)} />
  );
};

const AppWithAuth = () => (
  <AuthProvider>
    <ChatProvider>
      <App />
    </ChatProvider>
  </AuthProvider>
);
export default AppWithAuth;