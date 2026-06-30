import React, { useState, useEffect } from 'react';
import { callsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Calls.css';
import DialPad from './DialPad';

const Calls = ({ onStartCall, contacts = [] }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialPad, setShowDialPad] = useState(false);
  useEffect(() => {
    callsAPI.getHistory()
      .then(res => setHistory(res.data.calls))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getOtherUser = (call) => {
    if (call.caller?._id === user?._id) return call.recipients?.[0]?.user;
    return call.caller;
  };

  const getCallLabel = (call) => {
    const isOutgoing = call.caller?._id === user?._id;
    if (call.status === 'missed') return 'Missed';
    if (call.status === 'ended') return isOutgoing ? 'Outgoing' : 'Incoming';
    return call.status;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return ` · ${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="calls-page">
      <div className="calls-header">
        <h2>Calls</h2>
        <button
          className="icon-btn"
          onClick={() => setShowDialPad(true)}
          title="Dial pad"
        >
          🔢
        </button>
      </div>

      <div className="calls-section-label">Recent</div>

      {loading && (
        <div className="loading-text">Loading calls...</div>
      )}

      {!loading && history.length === 0 && (
        <div className="no-calls">
          <div style={{ fontSize: 52 }}>📵</div>
          <p>No recent calls</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Start a call from any chat
          </p>
        </div>
      )}

      {history.map((call) => {
        const other = getOtherUser(call);
        const isMissed = call.status === 'missed';
        return (
          <div key={call._id} className="call-history-item">
            <div className="call-avatar">
              {other?.avatar ? (
                <img src={other.avatar} alt={other.displayName} />
              ) : (
                <div className="call-avatar-placeholder">
                  {(other?.displayName || '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="call-history-info">
              <div
                className="call-history-name"
                style={{ color: isMissed ? '#ff4444' : 'var(--text-primary)' }}
              >
                {other?.displayName || 'Unknown'}
              </div>
              <div className="call-history-meta">
                <span>{call.type === 'video' ? '🎥' : '📞'}</span>
                <span style={{ color: isMissed ? '#ff4444' : 'var(--text-secondary)' }}>
                  {getCallLabel(call)}
                </span>
                <span>{formatDuration(call.duration)}</span>
              </div>
            </div>

            <div className="call-history-right">
              <div className="call-history-time">
                {formatTime(call.createdAt)}
              </div>
            </div>

            <button
              className="call-again-btn"
              onClick={() => onStartCall && onStartCall(other, call.type)}
              title="Call back"
            >
              {call.type === 'video' ? '📹' : '📞'}
            </button>
          </div>
        );
      })}

      {showDialPad && (
        <DialPad
          onClose={() => setShowDialPad(false)}
          onStartCall={onStartCall}
          contacts={contacts}
        />
      )}
    </div>
  );
};

export default Calls;