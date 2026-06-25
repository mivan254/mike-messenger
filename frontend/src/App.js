import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfilePanel from './components/Settings';
import './App.css';
import InstallButton from './components/InstallButton';

const ChatApp = () => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        onProfileOpen={() => setShowProfile(true)}
        onSettingsOpen={() => setShowProfile(true)}
      />
      <ChatWindow />
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
     <InstallButton />
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-inner">
          <div className="loading-logo">🔥</div>
          <h1>MIKE Messenger</h1>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <RegisterPage onSwitch={() => setShowRegister(false)} />
    ) : (
      <LoginPage onSwitch={() => setShowRegister(true)} />
    );
  }

  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
};

export default App;
