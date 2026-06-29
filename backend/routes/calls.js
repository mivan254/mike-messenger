const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.post('/initiate', protect, async (req, res) => {
  try {
    const { recipientIds, type, chatId } = req.body;
    const call = await Call.create({
      caller: req.user._id,
      recipients: recipientIds.map((id) => ({ user: id })),
      type: type || 'audio',
      chat: chatId,
      roomId: uuidv4(),
      status: 'ringing',
    });
    await call.populate('caller', 'username displayName avatar');
    await call.populate('recipients.user', 'username displayName avatar');
    res.status(201).json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/accept', protect, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    const recipient = call.recipients.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (recipient) {
      recipient.status = 'accepted';
      recipient.joinedAt = new Date();
    }
    if (call.status === 'ringing') {
      call.status = 'active';
      call.startedAt = new Date();
    }
    await call.save();
    res.json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/reject', protect, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    const recipient = call.recipients.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (recipient) recipient.status = 'rejected';
    const allRejected = call.recipients.every((r) => r.status === 'rejected');
    if (allRejected) call.status = 'ended';
    await call.save();
    res.json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/end', protect, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    call.status = 'ended';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    }
    await call.save();
    res.json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user._id },
        { 'recipients.user': req.user._id },
      ],
    })
      .populate('caller', 'username displayName avatar')
      .populate('recipients.user', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;