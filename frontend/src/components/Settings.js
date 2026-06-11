import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, usersAPI } from '../services/api';
import './Settings.css';

const ProfilePanel = ({ onClose }) => {
  const { user, updateUser, logout, toggleTheme, theme } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user);
      setMessage('✅ Profile saved');
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Save failed'));
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      return setMessage('❌ Passwords do not match');
    }
    setSaving(true);
    setMessage('');
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      setMessage('✅ Password changed');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
    }
    setSaving(false);
  };

  const setLockPin = async () => {
    if (pin.length < 4) return setMessage('❌ PIN must be at least 4 digits');
    try {
      await usersAPI.setChatLockPin(pin);
      setMessage('✅ Chat lock PIN set');
      setPin('');
    } catch {
      setMessage('❌ Failed to set PIN');
    }
  };

  const TABS = [
    { id: 'profile', label: '👤 Profile' },
    { id: 'security', label: '🔒 Security' },
    { id: 'privacy', label: '🕵️ Privacy' },
    { id: 'appearance', label: '🎨 Appearance' },
    { id: 'about', label: 'ℹ️ About' },
  ];

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="panel-body">
          <div className="panel-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="panel-content">
            {message && <div className="settings-msg">{message}</div>}

            {/* Profile tab */}
            {tab === 'profile' && (
              <div className="settings-section">
                <div className="avatar-upload">
                  <div className="avatar-big" style={{ background: 'var(--mike-green)' }}>
                    {form.avatar ? (
                      <img src={form.avatar} alt="avatar" />
                    ) : (
                      <span>{(user?.displayName || '?').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Avatar URL"
                    value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    className="settings-input"
                  />
                </div>

                <label className="settings-label">Display Name</label>
                <input
                  className="settings-input"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />

                <label className="settings-label">Bio</label>
                <textarea
                  className="settings-input"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  maxLength={200}
                  placeholder="Tell people about yourself..."
                />

                <label className="settings-label">Phone</label>
                <input
                  className="settings-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />

                <div className="settings-info">
                  <span>Email:</span> <strong>{user?.email}</strong><br />
                  <span>Username:</span> <strong>@{user?.username}</strong>
                </div>

                <button className="settings-btn" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            )}

            {/* Security tab */}
            {tab === 'security' && (
              <div className="settings-section">
                <h3>Change Password</h3>
                <label className="settings-label">Current Password</label>
                <input
                  className="settings-input"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                />
                <label className="settings-label">New Password</label>
                <input
                  className="settings-input"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                />
                <label className="settings-label">Confirm Password</label>
                <input
                  className="settings-input"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
                <button className="settings-btn" onClick={changePassword} disabled={saving}>
                  Change Password
                </button>

                <hr className="settings-divider" />

                <h3>Chat Lock PIN</h3>
                <p className="settings-desc">Set a PIN to lock individual chats in a hidden vault.</p>
                <input
                  className="settings-input"
                  type="password"
                  placeholder="Enter 4-6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
                <button className="settings-btn secondary" onClick={setLockPin}>
                  Set Chat Lock PIN
                </button>
              </div>
            )}

            {/* Privacy tab */}
            {tab === 'privacy' && (
              <div className="settings-section">
                <h3>Privacy Settings</h3>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Last Seen</div>
                    <div className="toggle-desc">Show when you were last online</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Read Receipts</div>
                    <div className="toggle-desc">Let others know when you've read their messages</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Online Status</div>
                    <div className="toggle-desc">Show when you're online</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <hr className="settings-divider" />

                <h3>End-to-End Encryption</h3>
                <div className="e2e-info">
                  <span>🔐</span>
                  <div>
                    <strong>Messages are encrypted in transit.</strong>
                    <p>MIKE Messenger uses TLS for transport encryption. Your messages are stored with encryption flags on MongoDB Atlas. Full client-side E2E encryption can be enabled with the MIKE Encryption Protocol (MEP v1) — messages are encrypted before leaving your device using AES-256.</p>
                    <p className="status-badge">MEP v1 Active</p>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance tab */}
            {tab === 'appearance' && (
              <div className="settings-section">
                <h3>Theme</h3>
                <div className="theme-options">
                  <button
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>
            )}

            {/* About tab */}
            {tab === 'about' && (
              <div className="settings-section">
                <div className="about-header">
                  <div style={{ fontSize: 48 }}>🔥</div>
                  <h2>MIKE Messenger</h2>
                  <p>Version 1.0.0</p>
                </div>
                <div className="about-features">
                  <div className="feature-item">✅ Real-time messaging via WebSocket</div>
                  <div className="feature-item">🔐 Encrypted message storage</div>
                  <div className="feature-item">🛡 Anti-delete recovery system</div>
                  <div className="feature-item">🔒 Chat lock vault</div>
                  <div className="feature-item">📱 Cross-device sync</div>
                  <div className="feature-item">👥 Group chats</div>
                  <div className="feature-item">📎 File & media sharing</div>
                  <div className="feature-item">🌐 Cloud-hosted on MongoDB Atlas</div>
                </div>
                <button className="settings-btn danger" onClick={logout}>
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
