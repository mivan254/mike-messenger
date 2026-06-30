import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './DialPad.css';

const BUTTONS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['*','0','#'],
];

const DialPad = ({ onClose, onStartCall, contacts = [] }) => {
  const [number, setNumber] = useState('');
  const [search, setSearch] = useState('');
  const [calling, setCalling] = useState(false);

  const handlePress = (val) => {
    setNumber(prev => prev + val);
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const handleCall = (type = 'audio', contact = null) => {
    if (!number && !contact) return;
    setCalling(true);
    setTimeout(() => {
      onStartCall && onStartCall(contact || { displayName: number, phoneNumber: number }, type);
      setCalling(false);
      onClose && onClose();
    }, 500);
  };

  const filtered = contacts.filter(c =>
    c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dialpad-overlay">
      <div className="dialpad-card">
        <div className="dialpad-header">
          <h3>📞 Dial Pad</h3>
          <button className="dialpad-close" onClick={onClose}>✕</button>
        </div>

        <div className="dialpad-search">
          <input
            placeholder="🔍 Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <div className="dialpad-contacts">
            {filtered.length === 0 && (
              <div className="no-contacts">No contacts found</div>
            )}
            {filtered.map((c, i) => (
              <div key={i} className="dialpad-contact-item">
                <div className="dialpad-avatar">
                  {c.avatar
                    ? <img src={c.avatar} alt={c.displayName} />
                    : <div className="dialpad-avatar-placeholder">{(c.displayName||'?')[0].toUpperCase()}</div>
                  }
                </div>
                <div className="dialpad-contact-info">
                  <div className="dialpad-contact-name">{c.displayName}</div>
                  <div className="dialpad-contact-user">@{c.username}</div>
                </div>
                <div className="dialpad-contact-actions">
                  <button onClick={() => handleCall('audio', c)} title="Voice call">📞</button>
                  <button onClick={() => handleCall('video', c)} title="Video call">🎥</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!search && (
          <>
            <div className="dialpad-display">
              <span className="dialpad-number">{number || <span className="dialpad-placeholder">Enter number</span>}</span>
              {number && (
                <button className="dialpad-backspace" onClick={handleDelete}>⌫</button>
              )}
            </div>

            <div className="dialpad-grid">
              {BUTTONS.map((row, i) => (
                <div key={i} className="dialpad-row">
                  {row.map(btn => (
                    <button
                      key={btn}
                      className="dialpad-btn"
                      onClick={() => handlePress(btn)}
                    >
                      <span className="dialpad-btn-main">{btn}</span>
                      <span className="dialpad-btn-sub">
                        {btn === '2' ? 'ABC' : btn === '3' ? 'DEF' :
                         btn === '4' ? 'GHI' : btn === '5' ? 'JKL' :
                         btn === '6' ? 'MNO' : btn === '7' ? 'PQRS' :
                         btn === '8' ? 'TUV' : btn === '9' ? 'WXYZ' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="dialpad-call-btns">
              <button
                className="dialpad-video-btn"
                onClick={() => handleCall('video')}
                disabled={!number || calling}
                title="Video call"
              >
                🎥
              </button>
              <button
                className={`dialpad-call-btn ${calling ? 'calling' : ''}`}
                onClick={() => handleCall('audio')}
                disabled={!number || calling}
                title="Voice call"
              >
                {calling ? '📳' : '📞'}
              </button>
              <button
                className="dialpad-end-btn"
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DialPad;