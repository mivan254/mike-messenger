import React, { useState, useEffect } from 'react';

const InstallButton = () => {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setPrompt(e);
    });
  }, []);

  if (!prompt) return null;

  return (
    <button
      onClick={() => prompt.prompt()}
      style={{
        position:'fixed', bottom:'20px', right:'20px',
        background:'#00a884', color:'#fff', border:'none',
        borderRadius:'50px', padding:'12px 20px',
        fontSize:'14px', fontWeight:'600', cursor:'pointer',
        zIndex:9999, boxShadow:'0 4px 12px rgba(0,168,132,0.4)'
      }}
    >
      📲 Install App
    </button>
  );
};

export default InstallButton;