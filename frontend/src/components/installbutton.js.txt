import React, { useState, useEffect } from 'react';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  return (
    <button onClick={handleInstall} style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#00a884',
      color: '#fff',
      border: 'none',
      borderRadius: '50px',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,168,132,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      📲 Install MIKE Messenger
    </button>
  );
};

export default InstallButton;