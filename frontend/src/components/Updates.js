import React, { useState, useEffect, useRef } from 'react';
import { statusAPI, uploadAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './Sidebar';
import { format } from 'date-fns';
import './Updates.css';

const COLORS = [
  '#00a884', '#008069', '#0084ff', '#ff4444',
  '#ff6b00', '#9c27b0', '#e91e63', '#2196f3',
];

const StatusViewer = ({ statusGroup, onClose, onReact }) => {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const status = statusGroup.statuses[current];

  useEffect(() => {
    setProgress(0);
    const duration = status?.media?.duration ? status.media.duration * 1000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressRef.current);
          if (current < statusGroup.statuses.length - 1) {
            setCurrent((c) => c + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    statusAPI.viewStatus(status._id).catch(() => {});

    return () => clearInterval(progressRef.current);
  }, [current, status]);

  const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

  return (
    <div className="status-viewer" onClick={onClose}>
      <div className="status-viewer-inner" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="status-progress-bars">
          {statusGroup.statuses.map((_, i) => (
            <div key={i} className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="status-viewer-header">
          <Avatar user={statusGroup.user} size={36} />
          <div>
            <div className="status-viewer-name">{statusGroup.user.displayName}</div>
            <div className="status-viewer-time">
              {format(new Date(status.createdAt), 'HH:mm')}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ marginLeft: 'auto', color: '#fff' }}>✕</button>
        </div>

        {/* Content */}
        <div
          className="status-content-display"
          style={{ background: status.type === 'text' ? status.backgroundColor : '#000' }}
        >
          {status.type === 'text' && (
            <p className="status-text-content">{status.content}</p>
          )}
          {status.type === 'image' && (
            <img src={status.media?.url} alt="status" className="status-media" />
          )}
          {status.type === 'video' && (
            <video src={status.media?.url} className="status-media" autoPlay controls />
          )}
        </div>

        {/* Navigation */}
        <div className="status-nav">
          <div className="status-nav-left" onClick={() => setCurrent((c) => Math.max(0, c - 1))} />
          <div className="status-nav-right" onClick={() => {
            if (current < statusGroup.statuses.length - 1) {
              setCurrent((c) => c + 1);
            } else {
              onClose();
            }
          }} />
        </div>

        {/* Reactions */}
        <div className="status-reactions">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => onReact(status._id, e)}>{e}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

const CreateStatus = ({ onClose, onCreated }) => {
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState('#00a884');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setType(f.type.startsWith('video') ? 'video' : 'image');
  };

  const handleCreate = async () => {
    setUploading(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (file) {
        const { data } = await uploadAPI.upload(file);
        mediaUrl = data.file.url;
        mediaType = file.type;
      }

      await statusAPI.createStatus({
        content,
        type,
        backgroundColor: bgColor,
        mediaUrl,
        mediaType,
      });

      onCreated();
      onClose();
    } catch (err) {
      alert('Failed to create status');
    }
    setUploading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Update</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="status-type-tabs">
          <button className={type === 'text' ? 'active' : ''} onClick={() => setType('text')}>✏️ Text</button>
          <button onClick={() => fileRef.current?.click()}>📷 Photo/Video</button>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        {type === 'text' && (
          <>
            <div className="status-preview-text" style={{ background: bgColor }}>
              <textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={700}
              />
            </div>
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  style={{ background: c, outline: bgColor === c ? '3px solid #fff' : 'none' }}
                  onClick={() => setBgColor(c)}
                />
              ))}
            </div>
          </>
        )}

        {(type === 'image' || type === 'video') && preview && (
          <div className="media-preview">
            {type === 'image' ? (
              <img src={preview} alt="preview" />
            ) : (
              <video src={preview} controls />
            )}
            <textarea
              placeholder="Add a caption..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="caption-input"
            />
          </div>
        )}

        <button
          className="settings-btn"
          onClick={handleCreate}
          disabled={uploading || (!content && !file)}
          style={{ margin: '12px 16px' }}
        >
          {uploading ? 'Posting...' : '📤 Share Update'}
        </button>
      </div>
    </div>
  );
};

const Updates = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = async () => {
    try {
      const [updatesRes, myRes] = await Promise.all([
        statusAPI.getUpdates(),
        statusAPI.getMyStatus(),
      ]);
      setUpdates(updatesRes.data.updates);
      setMyStatuses(myRes.data.statuses);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleReact = async (statusId, emoji) => {
    try {
      await statusAPI.reactToStatus(statusId, emoji);
    } catch {}
  };

  return (
    <div className="updates-page">
      <div className="updates-header">
        <h2>Updates</h2>
        <button className="icon-btn" onClick={() => setShowCreate(true)} title="Add update">✏️</button>
      </div>

      {/* My status */}
      <div className="my-status-row" onClick={() => myStatuses.length > 0 ? setViewing({ user, statuses: myStatuses }) : setShowCreate(true)}>
        <div className="my-status-avatar">
          <Avatar user={user} size={46} />
          <div className="add-status-btn">+</div>
        </div>
        <div>
          <div className="my-status-title">My update</div>
          <div className="my-status-sub">
            {myStatuses.length > 0 ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}` : 'Tap to add update'}
          </div>
        </div>
      </div>

      <div className="updates-divider">Recent updates</div>

      {loading && <div className="loading-text">Loading updates...</div>}

      {!loading && updates.length === 0 && (
        <div className="no-updates">
          <div style={{ fontSize: 48 }}>📢</div>
          <p>No updates yet</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Updates from contacts will appear here</p>
        </div>
      )}

      {updates.map((group) => (
        <div
          key={group.user._id}
          className={`update-item ${group.hasUnviewed ? 'unviewed' : ''}`}
          onClick={() => setViewing(group)}
        >
          <div className="update-avatar-ring">
            <Avatar user={group.user} size={46} />
          </div>
          <div className="update-info">
            <div className="update-name">{group.user.displayName}</div>
            <div className="update-time">
              {format(new Date(group.statuses[0].createdAt), 'HH:mm')}
              {' · '}{group.statuses.length} update{group.statuses.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      ))}

      {viewing && (
        <StatusViewer
          statusGroup={viewing}
          onClose={() => setViewing(null)}
          onReact={handleReact}
        />
      )}

      {showCreate && (
        <CreateStatus
          onClose={() => setShowCreate(false)}
          onCreated={fetchUpdates}
        />
      )}
    </div>
  );
};

export default Updates;