import React, { useState, useCallback } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { chatsAPI, usersAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import './Sidebar.css';

const Avatar = ({ user, size = 40 }) => {
  const initials = (user?.displayName || user?.username || '?').slice(0, 2).toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user.displayName} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

const NewChatModal = ({ onClose, onChatCreated }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]);

  const search = useCallback(async (q) => {
    setQuery(q);
    if (q.length < 2) return setResults([]);
    setLoading(true);
    try {
      const { data } = await usersAPI.search(q);
      setResults(data.users);
    } catch {}
    setLoading(false);
  }, []);

  const startChat = async (userId) => {
    try {
      const { data } = await chatsAPI.createChat(userId);
      onChatCreated(data.chat);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not start chat');
    }
  };

  const toggleSelect = (u) => {
    setSelected((prev) =>
      prev.find((s) => s._id === u._id) ? prev.filter((s) => s._id !== u._id) : [...prev, u]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.length < 2) return;
    try {
      const { data } = await chatsAPI.createGroup({
        name: groupName,
        participants: selected.map((u) => u._id),
      });
      onChatCreated(data.chat);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not create group');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{groupMode ? 'New Group' : 'New Chat'}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button className={!groupMode ? 'active' : ''} onClick={() => setGroupMode(false)}>Direct</button>
          <button className={groupMode ? 'active' : ''} onClick={() => setGroupMode(true)}>Group</button>
        </div>

        {groupMode && (
          <input
            className="modal-input"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        )}

        <input
          className="modal-input"
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => search(e.target.value)}
          autoFocus
        />

        {groupMode && selected.length > 0 && (
          <div className="selected-users">
            {selected.map((u) => (
              <span key={u._id} className="selected-chip" onClick={() => toggleSelect(u)}>
                {u.displayName} ✕
              </span>
            ))}
          </div>
        )}

        <div className="search-results">
          {loading && <p className="loading-text">Searching...</p>}
          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="loading-text">No users found</p>
          )}
          {results.map((u) => (
            <div
              key={u._id}
              className={`search-result-item ${groupMode && selected.find((s) => s._id === u._id) ? 'selected' : ''}`}
              onClick={() => groupMode ? toggleSelect(u) : startChat(u._id)}
            >
              <Avatar user={u} size={36} />
              <div>
                <div className="result-name">{u.displayName}</div>
                <div className="result-username">@{u.username}</div>
              </div>
              {u.isOnline && <span className="online-dot" />}
            </div>
          ))}
        </div>

        {groupMode && (
          <button
            className="create-group-btn"
            onClick={createGroup}
            disabled={!groupName.trim() || selected.length < 2}
          >
            Create Group ({selected.length} members)
          </button>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({ onProfileOpen, onSettingsOpen }) => {
  const { user, logout } = useAuth();
  const { chats, activeChat, openChat, fetchChats, loadingChats, onlineStatuses } = useChat();
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const handleChatCreated = (chat) => {
    fetchChats();
    openChat(chat);
  };

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.name;
    const other = chat.participants?.find((p) => p.user._id !== user._id);
    return other?.user?.displayName || other?.user?.username || 'Unknown';
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return null;
    return chat.participants?.find((p) => p.user._id !== user._id)?.user;
  };

  const getOnlineStatus = (chat) => {
    if (chat.isGroup) return null;
    const other = chat.participants?.find((p) => p.user._id !== user._id)?.user;
    if (!other) return false;
    return onlineStatuses[other._id]?.isOnline ?? other.isOnline;
  };

  const filteredChats = chats.filter((c) => {
    const name = getChatName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    if (chat.lastMessage.isDeleted) return '🗑 Message deleted';
    const content = chat.lastMessage.content;
    if (chat.lastMessage.type !== 'text') {
      const icons = { image: '📷 Photo', video: '🎥 Video', audio: '🎵 Audio', file: '📎 File', voice_note: '🎙 Voice note' };
      return icons[chat.lastMessage.type] || content;
    }
    return content?.length > 40 ? content.slice(0, 40) + '…' : content;
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-user" onClick={onProfileOpen}>
          <Avatar user={user} size={38} />
          <span className="sidebar-username">{user?.displayName}</span>
        </div>
        <div className="sidebar-actions">
          <button className="icon-btn" title="New Chat" onClick={() => setShowNewChat(true)}>✏️</button>
          <div className="menu-wrapper">
            <button className="icon-btn" onClick={() => setShowMenu(!showMenu)}>⋮</button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={() => { onSettingsOpen(); setShowMenu(false); }}>⚙ Settings</button>
                <button onClick={() => { onProfileOpen(); setShowMenu(false); }}>👤 Profile</button>
                <button onClick={logout} className="danger">🚪 Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="🔍  Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Chat list */}
      <div className="chat-list">
        {loadingChats && (
          <div className="loading-chats">
            {[1, 2, 3, 4].map((i) => <div key={i} className="chat-skeleton" />)}
          </div>
        )}

        {!loadingChats && filteredChats.length === 0 && (
          <div className="no-chats">
            <p>No chats yet</p>
            <button className="new-chat-btn" onClick={() => setShowNewChat(true)}>
              Start a conversation
            </button>
          </div>
        )}

        {filteredChats.map((chat) => {
          const isOnline = getOnlineStatus(chat);
          const chatUser = getChatAvatar(chat);
          const isActive = activeChat?._id === chat._id;

          return (
            <div
              key={chat._id}
              className={`chat-item ${isActive ? 'active' : ''}`}
              onClick={() => openChat(chat)}
            >
              <div className="chat-item-avatar">
                <Avatar user={chatUser} size={46} />
                {isOnline && <span className="online-badge" />}
              </div>
              <div className="chat-item-info">
                <div className="chat-item-top">
                  <span className="chat-name truncate">{getChatName(chat)}</span>
                  {chat.lastMessage && (
                    <span className="chat-time">
                      {formatDistanceToNow(new Date(chat.lastActivity), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="chat-item-preview truncate">
                  {getLastMessagePreview(chat)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
};

export { Avatar };
export default Sidebar;
