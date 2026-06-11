import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { uploadAPI } from '../services/api';
import { getSocket, emitTypingStart, emitTypingStop, emitMessageSeen, sendMessage, editMessage, deleteMessage } from '../services/socket';
import { Avatar } from './Sidebar';
import './ChatWindow.css';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅'];

const MessageBubble = ({ msg, isOwn, onReply, onEdit, onDelete, onReact, onViewOriginal, userId }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const menuRef = useRef(null);

  const getStatusIcon = () => {
    if (!isOwn) return null;
    if (msg.seenBy?.length > 0) return <span className="status-icon seen" title="Seen">✓✓</span>;
    if (msg.deliveredTo?.length > 0) return <span className="status-icon delivered" title="Delivered">✓✓</span>;
    return <span className="status-icon sent" title="Sent">✓</span>;
  };

  const getReactionCounts = () => {
    if (!msg.reactions?.length) return null;
    const counts = {};
    msg.reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  };

  const reactionCounts = getReactionCounts();

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="msg-avatar">
          <Avatar user={msg.sender} size={28} />
        </div>
      )}

      <div className="bubble-group">
        {!isOwn && msg.sender && (
          <span className="msg-sender-name">{msg.sender.displayName}</span>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div className="reply-preview">
            <span className="reply-bar" />
            <div>
              <span className="reply-name">{msg.replyTo.sender?.displayName || 'Unknown'}</span>
              <span className="reply-content">{msg.replyTo.content || '📎 Attachment'}</span>
            </div>
          </div>
        )}

        <div
          className={`bubble ${isOwn ? 'bubble-out' : 'bubble-in'} ${msg.isDeleted ? 'deleted' : ''}`}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
        >
          {/* Media */}
          {msg.type === 'image' && msg.media?.url && (
            <img src={msg.media.url} alt="shared" className="msg-image" onClick={() => window.open(msg.media.url)} />
          )}
          {msg.type === 'video' && msg.media?.url && (
            <video src={msg.media.url} controls className="msg-video" />
          )}
          {msg.type === 'audio' && msg.media?.url && (
            <audio src={msg.media.url} controls className="msg-audio" />
          )}
          {msg.type === 'voice_note' && msg.media?.url && (
            <audio src={msg.media.url} controls className="msg-audio" />
          )}
          {msg.type === 'file' && msg.media?.url && (
            <a href={msg.media.url} target="_blank" rel="noreferrer" className="msg-file">
              📎 {msg.media.filename || 'File'}
            </a>
          )}

          {/* Text content */}
          <span className={`msg-text ${msg.isDeleted ? 'deleted-text' : ''}`}>
            {msg.content}
          </span>

          {/* Footer */}
          <div className="msg-footer">
            {msg.isEdited && <span className="edited-tag">edited</span>}
            <span className="msg-time">{format(new Date(msg.createdAt), 'HH:mm')}</span>
            {getStatusIcon()}
          </div>
        </div>

        {/* Reactions */}
        {reactionCounts && (
          <div className="reactions-row">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span key={emoji} className="reaction-chip" onClick={() => onReact(msg._id, emoji)}>
                {emoji} {count > 1 ? count : ''}
              </span>
            ))}
          </div>
        )}

        {/* Context menu */}
        {showMenu && (
          <div className={`msg-context-menu ${isOwn ? 'right' : 'left'}`} ref={menuRef}>
            <button onClick={() => { setShowReactions(true); setShowMenu(false); }}>React</button>
            <button onClick={() => { onReply(msg); setShowMenu(false); }}>Reply</button>
            {isOwn && !msg.isDeleted && (
              <button onClick={() => { onEdit(msg); setShowMenu(false); }}>Edit</button>
            )}
            {isOwn && !msg.isDeleted && (
              <button className="danger" onClick={() => { onDelete(msg._id); setShowMenu(false); }}>Delete</button>
            )}
            {msg.isDeleted && (
              <button onClick={() => { onViewOriginal(msg._id); setShowMenu(false); }}>View original (MIKE)</button>
            )}
            <button onClick={() => setShowMenu(false)}>Cancel</button>
          </div>
        )}

        {/* Emoji picker */}
        {showReactions && (
          <div className="quick-reactions">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { onReact(msg._id, e); setShowReactions(false); }}>
                {e}
              </button>
            ))}
            <button onClick={() => setShowReactions(false)}>✕</button>
          </div>
        )}
      </div>

      {/* Click away */}
      {(showMenu || showReactions) && (
        <div className="click-away" onClick={() => { setShowMenu(false); setShowReactions(false); }} />
      )}
    </div>
  );
};

const TypingIndicator = ({ names }) => (
  <div className="typing-indicator">
    <div className="typing-dots">
      <span /><span /><span />
    </div>
    <span>{names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing...</span>
  </div>
);

const ChatWindow = () => {
  const { user } = useAuth();
  const { activeChat, messages, typingUsers, onlineStatuses, fetchMessages, updateMessage } = useChat();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const chatId = activeChat?._id;
  const chatMessages = chatId ? (messages[chatId] || []) : [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Focus input on chat change
  useEffect(() => {
    if (activeChat) inputRef.current?.focus();
    setInput('');
    setReplyTo(null);
    setEditingMsg(null);
  }, [activeChat?._id]);

  // Mark messages as seen
  useEffect(() => {
    if (!chatMessages.length || !user) return;
    const socket = getSocket();
    const unseenMsgs = chatMessages.filter(
      (m) => m.sender?._id !== user._id && !m.seenBy?.some((s) => s.user === user._id || s.user?._id === user._id)
    );
    unseenMsgs.forEach((m) => emitMessageSeen(m._id, chatId));
  }, [chatMessages, user, chatId]);

  const handleTyping = useCallback(() => {
    if (!chatId) return;
    emitTypingStart(chatId);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTypingStop(chatId), 2000);
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && !editingMsg) return;
    if (!chatId) return;

    if (editingMsg) {
      try {
        await editMessage(editingMsg._id, text, chatId);
        updateMessage(chatId, editingMsg._id, { content: text, isEdited: true });
      } catch (err) {
        alert('Could not edit message');
      }
      setEditingMsg(null);
      setInput('');
      return;
    }

    try {
      await sendMessage({
        chatId,
        content: text,
        type: 'text',
        replyTo: replyTo?._id || null,
      });
      setInput('');
      setReplyTo(null);
      emitTypingStop(chatId);
    } catch (err) {
      alert('Could not send message: ' + err.message);
    }
  }, [input, chatId, replyTo, editingMsg, updateMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const { data } = await uploadAPI.upload(file, (evt) => {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });

      const type = file.type.startsWith('image') ? 'image'
        : file.type.startsWith('video') ? 'video'
        : file.type.startsWith('audio') ? 'audio'
        : 'file';

      await sendMessage({
        chatId,
        content: data.file.filename,
        type,
        mediaUrl: data.file.url,
        mediaFilename: data.file.filename,
        mediaMimetype: data.file.mimetype,
        mediaSize: data.file.size,
      });
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (messageId) => {
    try {
      await deleteMessage(messageId, chatId);
    } catch {
      alert('Could not delete message');
    }
  };

  const handleReact = async (messageId, emoji) => {
    const socket = getSocket();
    socket?.emit('add_reaction', { messageId, emoji, chatId });
  };

  const handleViewOriginal = async (messageId) => {
    try {
      const { messagesAPI } = await import('../services/api');
      const { data } = await messagesAPI.getOriginal(messageId);
      alert(`🔐 MIKE Anti-Delete Recovery:\n\n"${data.originalContent || 'No original content found'}"\n\nEdit history: ${data.editHistory?.length || 0} edits`);
    } catch {
      alert('Could not recover original message.');
    }
  };

  // Typing users in this chat (excluding self)
  const typingInThisChat = Array.from(typingUsers[chatId] || new Set()).filter((id) => id !== user?._id);
  const typingNames = typingInThisChat.map((id) => {
    const participant = activeChat?.participants?.find((p) => p.user._id === id || p.user === id);
    return participant?.user?.displayName || 'Someone';
  });

  const getOtherUser = () => {
    if (!activeChat || activeChat.isGroup) return null;
    return activeChat.participants?.find((p) => p.user._id !== user._id)?.user;
  };

  const otherUser = getOtherUser();
  const isOtherOnline = otherUser
    ? (onlineStatuses[otherUser._id]?.isOnline ?? otherUser?.isOnline)
    : false;

  const headerSubtitle = activeChat?.isGroup
    ? `${activeChat.participants?.length || 0} members`
    : isOtherOnline
    ? 'Online'
    : otherUser?.lastSeen
    ? `Last seen ${format(new Date(otherUser.lastSeen), 'MMM d, HH:mm')}`
    : 'Offline';

  if (!activeChat) {
    return (
      <div className="chat-welcome">
        <div className="welcome-inner">
          <div className="welcome-icon">🔥</div>
          <h2>MIKE Messenger</h2>
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const chatName = activeChat.isGroup
    ? activeChat.name
    : otherUser?.displayName || 'Chat';

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <Avatar user={otherUser} size={38} />
        <div className="chat-header-info">
          <div className="chat-header-name">{chatName}</div>
          <div className={`chat-header-status ${isOtherOnline ? 'online' : ''}`}>
            {typingNames.length > 0 ? <span className="typing-label">typing...</span> : headerSubtitle}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        <div className="messages-inner">
          {chatMessages.map((msg, i) => {
            const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
            const showDate =
              i === 0 ||
              format(new Date(msg.createdAt), 'yyyy-MM-dd') !==
                format(new Date(chatMessages[i - 1].createdAt), 'yyyy-MM-dd');

            return (
              <React.Fragment key={msg._id}>
                {showDate && (
                  <div className="date-divider">
                    <span>{format(new Date(msg.createdAt), 'MMMM d, yyyy')}</span>
                  </div>
                )}
                <MessageBubble
                  msg={msg}
                  isOwn={isOwn}
                  userId={user?._id}
                  onReply={setReplyTo}
                  onEdit={(m) => { setEditingMsg(m); setInput(m.content); inputRef.current?.focus(); }}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onViewOriginal={handleViewOriginal}
                />
              </React.Fragment>
            );
          })}

          {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="reply-bar-container">
          <div className="reply-bar-content">
            <span className="reply-bar-label">Replying to {replyTo.sender?.displayName}</span>
            <span className="reply-bar-text">{replyTo.content}</span>
          </div>
          <button className="icon-btn" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Edit bar */}
      {editingMsg && (
        <div className="reply-bar-container editing">
          <div className="reply-bar-content">
            <span className="reply-bar-label">✏️ Editing message</span>
            <span className="reply-bar-text">{editingMsg.content}</span>
          </div>
          <button className="icon-btn" onClick={() => { setEditingMsg(null); setInput(''); }}>✕</button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span>Uploading... {uploadProgress}%</span>
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button
          className="icon-btn attach-btn"
          title="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>

        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        <button
          className={`send-btn ${input.trim() ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() && !editingMsg}
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
