const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');

// @route   PUT /api/messages/:id
// @desc    Edit a message
router.put('/:id', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot edit another user\'s message' });
    }

    // Save original to edit history
    message.editHistory.push({ content: message.content });
    message.content = content;
    message.isEdited = true;
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message (soft delete — MIKE retains original)
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot delete another user\'s message' });
    }

    // MIKE anti-delete: preserve original content
    if (!message.originalContent) {
      message.originalContent = message.content;
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    message.content = 'This message was deleted';
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/messages/:id/react
// @desc    Add/remove emoji reaction
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const existingReaction = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReaction >= 0) {
      message.reactions.splice(existingReaction, 1);
    } else {
      // Remove any existing reaction from same user
      message.reactions = message.reactions.filter((r) => r.user.toString() !== req.user._id.toString());
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();
    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/messages/:id/seen
// @desc    Mark message as seen
router.post('/:id/seen', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const alreadySeen = message.seenBy.some((s) => s.user.toString() === req.user._id.toString());
    if (!alreadySeen) {
      message.seenBy.push({ user: req.user._id });
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/messages/:id/original
// @desc    MIKE anti-delete: recover original message content
router.get('/:id/original', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id).select('+originalContent');
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    // Only chat participants can view
    const chat = await Chat.findById(message.chat);
    const isMember = chat.participants.some((p) => p.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not authorized' });

    res.json({ success: true, originalContent: message.originalContent, editHistory: message.editHistory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
