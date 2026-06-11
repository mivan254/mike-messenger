const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        nickname: String,
        // Per-user mute state
        mutedUntil: Date,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupAvatar: {
      type: String,
      default: '',
    },
    groupDescription: {
      type: String,
      maxlength: 500,
      default: '',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    // MIKE anti-delete: messages are always retained server-side
    antiDeleteEnabled: {
      type: Boolean,
      default: true,
    },
    // Chat backup
    lastBackup: Date,
    // Encrypted
    isEncrypted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ChatSchema.index({ 'participants.user': 1 });
ChatSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Chat', ChatSchema);
