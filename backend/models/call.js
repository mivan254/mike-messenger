const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipients: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected', 'missed'],
          default: 'pending',
        },
        joinedAt: Date,
        leftAt: Date,
      },
    ],
    type: {
      type: String,
      enum: ['audio', 'video', 'meeting'],
      default: 'audio',
    },
    status: {
      type: String,
      enum: ['ringing', 'active', 'ended', 'missed'],
      default: 'ringing',
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number,
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    // WebRTC signaling
    roomId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', CallSchema);