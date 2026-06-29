const express = require('express');
const router = express.Router();
const Status = require('../models/Status');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/status
// @desc    Create a new status
router.post('/', protect, async (req, res) => {
  try {
    const { content, type, backgroundColor, mediaUrl, mediaType, mediaDuration } = req.body;

    const status = await Status.create({
      user: req.user._id,
      content,
      type: type || 'text',
      backgroundColor: backgroundColor || '#00a884',
      media: mediaUrl ? {
        url: mediaUrl,
        type: mediaType,
        duration: mediaDuration,
      } : undefined,
    });

    await status.populate('user', 'username displayName avatar');
    res.status(201).json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/status
// @desc    Get all active statuses from contacts
router.get('/', protect, async (req, res) => {
  try {
    const statuses = await Status.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'username displayName avatar')
      .populate('views.user', 'username displayName avatar')
      .sort({ createdAt: -1 });

    // Group by user
    const grouped = {};
    statuses.forEach((s) => {
      const userId = s.user._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: s.user,
          statuses: [],
          hasUnviewed: false,
        };
      }
      const viewed = s.views.some((v) => v.user._id.toString() === req.user._id.toString());
      if (!viewed) grouped[userId].hasUnviewed = true;
      grouped[userId].statuses.push(s);
    });

    res.json({ success: true, updates: Object.values(grouped) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/status/my
// @desc    Get my statuses
router.get('/my', protect, async (req, res) => {
  try {
    const statuses = await Status.find({
      user: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({ success: true, statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/status/:id/view
// @desc    Mark status as viewed
router.post('/:id/view', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    const alreadyViewed = status.views.some(
      (v) => v.user.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      status.views.push({ user: req.user._id });
      await status.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/status/:id/react
// @desc    React to a status
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    status.reactions = status.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );
    status.reactions.push({ user: req.user._id, emoji });
    await status.save();

    res.json({ success: true, reactions: status.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/status/:id
// @desc    Delete a status
router.delete('/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    status.isActive = false;
    await status.save();

    res.json({ success: true, message: 'Status deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;