const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/chats
// @desc    Get all chats for current user
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ 'participants.user': req.user._id })
      .populate('participants.user', 'username displayName avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        select: 'content type sender createdAt isDeleted',
        populate: { path: 'sender', select: 'username displayName' },
      })
      .sort({ lastActivity: -1 });

    // Filter out locked chats unless explicitly requested
    const lockedChatIds = req.user.lockedChats.map((id) => id.toString());
    const { showLocked } = req.query;

    const filteredChats = showLocked === 'true'
      ? chats
      : chats.filter((c) => !lockedChatIds.includes(c._id.toString()));

    res.json({ success: true, chats: filteredChats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/chats
// @desc    Create or get 1-to-1 chat
router.post('/', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if blocked
    if (req.user.blockedUsers.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Cannot chat with blocked user' });
    }

    // Check if 1-1 chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      'participants.user': { $all: [req.user._id, userId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    }).populate('participants.user', 'username displayName avatar isOnline lastSeen');

    if (chat) return res.json({ success: true, chat, isNew: false });

    // Create new chat
    chat = await Chat.create({
      isGroup: false,
      participants: [
        { user: req.user._id, role: 'admin' },
        { user: userId, role: 'member' },
      ],
      createdBy: req.user._id,
    });

    chat = await Chat.findById(chat._id).populate(
      'participants.user',
      'username displayName avatar isOnline lastSeen'
    );

    res.status(201).json({ success: true, chat, isNew: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/chats/group
// @desc    Create group chat
router.post('/group', protect, async (req, res) => {
  try {
    const { name, participants, description } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Group name required' });
    if (!participants || participants.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 participants required' });
    }

    const allParticipants = [
      { user: req.user._id, role: 'admin' },
      ...participants.map((id) => ({ user: id, role: 'member' })),
    ];

    const chat = await Chat.create({
      name,
      isGroup: true,
      participants: allParticipants,
      createdBy: req.user._id,
      groupDescription: description || '',
    });

    const populated = await Chat.findById(chat._id).populate(
      'participants.user',
      'username displayName avatar isOnline lastSeen'
    );

    res.status(201).json({ success: true, chat: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/chats/:id/messages
// @desc    Get messages for a chat
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const isMember = chat.participants.some((p) => p.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member of this chat' });

    const messages = await Message.find({ chat: req.params.id })
      .populate('sender', 'username displayName avatar')
      .populate('replyTo', 'content sender type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ chat: req.params.id });

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/chats/:id/lock
// @desc    Lock/unlock a chat
router.put('/:id/lock', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const chatId = req.params.id;
    const isLocked = user.lockedChats.some((id) => id.toString() === chatId);

    if (isLocked) {
      user.lockedChats = user.lockedChats.filter((id) => id.toString() !== chatId);
    } else {
      user.lockedChats.push(chatId);
    }

    await user.save();
    res.json({ success: true, locked: !isLocked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/chats/:id
// @desc    Leave/delete chat
router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (!chat.isGroup) {
      await Chat.findByIdAndDelete(req.params.id);
      await Message.deleteMany({ chat: req.params.id });
      return res.json({ success: true, message: 'Chat deleted' });
    }

    // Group: remove participant
    chat.participants = chat.participants.filter((p) => p.user.toString() !== req.user._id.toString());
    if (chat.participants.length === 0) {
      await Chat.findByIdAndDelete(req.params.id);
    } else {
      await chat.save();
    }

    res.json({ success: true, message: 'Left group' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
