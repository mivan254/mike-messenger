const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/users/search?q=query
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, users: [] });
    }

    const regex = new RegExp(q.trim(), 'i');
    const users = await User.find({
      $and: [
        { $or: [{ username: regex }, { displayName: regex }, { email: regex }] },
        { _id: { $ne: req.user._id } },
        { _id: { $nin: req.user.blockedUsers } },
      ],
    })
      .select('username displayName avatar isOnline lastSeen bio')
      .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username displayName avatar bio isOnline lastSeen settings'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/block/:id
router.post('/block/:id', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    const user = await User.findById(req.user._id);

    if (user.blockedUsers.includes(targetId)) {
      user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetId);
      await user.save();
      return res.json({ success: true, message: 'User unblocked' });
    }

    user.blockedUsers.push(targetId);
    await user.save();
    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/report/:id
router.post('/report/:id', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.user._id);

    const alreadyReported = user.reportedUsers.some((r) => r.user.toString() === req.params.id);
    if (alreadyReported) {
      return res.status(400).json({ success: false, message: 'Already reported this user' });
    }

    user.reportedUsers.push({ user: req.params.id, reason: reason || 'No reason given' });
    await user.save();
    res.json({ success: true, message: 'User reported' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/chat-lock
router.put('/chat-lock', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(req.user._id, { chatLockPin: hashed });
    res.json({ success: true, message: 'Chat lock PIN set' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/verify-lock-pin
router.post('/verify-lock-pin', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const bcrypt = require('bcryptjs');
    const user = await User.findById(req.user._id).select('+chatLockPin');
    if (!user.chatLockPin) return res.status(400).json({ success: false, message: 'No PIN set' });

    const isValid = await bcrypt.compare(pin, user.chatLockPin);
    res.json({ success: isValid, message: isValid ? 'PIN verified' : 'Incorrect PIN' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
