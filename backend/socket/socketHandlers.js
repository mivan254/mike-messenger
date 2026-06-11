const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { verifySocketToken } = require('../middleware/auth');

// Map: userId -> Set of socketIds (user may have multiple tabs)
const onlineUsers = new Map();

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('Authentication error'));

    const decoded = verifySocketToken(token);
    if (!decoded) return next(new Error('Invalid token'));

    socket.userId = decoded.id;
    next();
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🟢 User connected: ${userId} (socket: ${socket.id})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Update user online status and socketId in DB
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });

    // Broadcast online status to contacts
    socket.broadcast.emit('user_status_change', { userId, isOnline: true });

    // Join all user's chat rooms
    const userChats = await Chat.find({ 'participants.user': userId }).select('_id');
    userChats.forEach((chat) => socket.join(`chat:${chat._id}`));

    // ─────────────────────────────────────────
    // SEND MESSAGE
    // ─────────────────────────────────────────
    socket.on('send_message', async (data, callback) => {
      try {
        const { chatId, content, type = 'text', replyTo, mediaUrl, mediaFilename, mediaMimetype, mediaSize, isViewOnce } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) return callback?.({ error: 'Chat not found' });

        const isMember = chat.participants.some((p) => p.user.toString() === userId);
        if (!isMember) return callback?.({ error: 'Not a member' });

        // Build message
        const messageData = {
          chat: chatId,
          sender: userId,
          content: content || '',
          type,
          isViewOnce: isViewOnce || false,
          isEncrypted: true,
        };

        if (replyTo) messageData.replyTo = replyTo;
        if (mediaUrl) {
          messageData.media = { url: mediaUrl, filename: mediaFilename, mimetype: mediaMimetype, size: mediaSize };
        }

        const message = await Message.create(messageData);
        await message.populate('sender', 'username displayName avatar');
        if (message.replyTo) await message.populate('replyTo', 'content sender type');

        // Update chat lastMessage and lastActivity
        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, lastActivity: new Date() });

        // Emit to all participants in room
        io.to(`chat:${chatId}`).emit('receive_message', {
          message,
          chatId,
        });

        callback?.({ success: true, message });
      } catch (error) {
        console.error('send_message error:', error);
        callback?.({ error: error.message });
      }
    });

    // ─────────────────────────────────────────
    // TYPING INDICATORS
    // ─────────────────────────────────────────
    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing_indicator', { userId, chatId, isTyping: true });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing_indicator', { userId, chatId, isTyping: false });
    });

    // ─────────────────────────────────────────
    // MESSAGE SEEN
    // ─────────────────────────────────────────
    socket.on('message_seen', async ({ messageId, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadySeen = message.seenBy.some((s) => s.user.toString() === userId);
        if (!alreadySeen) {
          message.seenBy.push({ user: userId });
          await message.save();
        }

        // Notify sender
        io.to(`chat:${chatId}`).emit('message_seen_update', {
          messageId,
          seenBy: userId,
          chatId,
        });
      } catch (error) {
        console.error('message_seen error:', error);
      }
    });

    // ─────────────────────────────────────────
    // MESSAGE DELIVERED
    // ─────────────────────────────────────────
    socket.on('message_delivered', async ({ messageId, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyDelivered = message.deliveredTo.some((d) => d.user.toString() === userId);
        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: userId });
          await message.save();
        }

        io.to(`chat:${chatId}`).emit('message_delivered_update', { messageId, deliveredTo: userId });
      } catch (error) {
        console.error('message_delivered error:', error);
      }
    });

    // ─────────────────────────────────────────
    // EDIT MESSAGE
    // ─────────────────────────────────────────
    socket.on('edit_message', async ({ messageId, content, chatId }, callback) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return callback?.({ error: 'Message not found' });
        if (message.sender.toString() !== userId) return callback?.({ error: 'Cannot edit others message' });

        message.editHistory.push({ content: message.content });
        message.content = content;
        message.isEdited = true;
        await message.save();

        io.to(`chat:${chatId}`).emit('message_edited', { messageId, content, chatId, isEdited: true });
        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // ─────────────────────────────────────────
    // DELETE MESSAGE
    // ─────────────────────────────────────────
    socket.on('delete_message', async ({ messageId, chatId }, callback) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return callback?.({ error: 'Message not found' });
        if (message.sender.toString() !== userId) return callback?.({ error: 'Not authorized' });

        if (!message.originalContent) message.originalContent = message.content;
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = userId;
        message.content = 'This message was deleted';
        await message.save();

        io.to(`chat:${chatId}`).emit('message_deleted', { messageId, chatId });
        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // ─────────────────────────────────────────
    // EMOJI REACTION
    // ─────────────────────────────────────────
    socket.on('add_reaction', async ({ messageId, emoji, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Toggle reaction
        const idx = message.reactions.findIndex(
          (r) => r.user.toString() === userId && r.emoji === emoji
        );
        if (idx >= 0) {
          message.reactions.splice(idx, 1);
        } else {
          message.reactions = message.reactions.filter((r) => r.user.toString() !== userId);
          message.reactions.push({ user: userId, emoji });
        }
        await message.save();

        io.to(`chat:${chatId}`).emit('reaction_updated', {
          messageId,
          reactions: message.reactions,
          chatId,
        });
      } catch (error) {
        console.error('add_reaction error:', error);
      }
    });

    // ─────────────────────────────────────────
    // JOIN CHAT ROOM
    // ─────────────────────────────────────────
    socket.on('join_chat', ({ chatId }) => {
      socket.join(`chat:${chatId}`);
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔴 User disconnected: ${userId} (socket: ${socket.id})`);

      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          socket.broadcast.emit('user_status_change', { userId, isOnline: false, lastSeen: new Date() });
        }
      }
    });
  });

  return { onlineUsers };
};

module.exports = setupSocket;
