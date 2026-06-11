const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  reactedAt: { type: Date, default: Date.now },
});

const MessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Message content
    content: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'voice_note', 'system'],
      default: 'text',
    },
    // Media attachment
    media: {
      url: String,
      filename: String,
      mimetype: String,
      size: Number,
      duration: Number, // for audio/video in seconds
      thumbnail: String,
    },
    // Reply functionality
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Forward
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Delivery status per recipient
    seenBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seenAt: { type: Date, default: Date.now },
      },
    ],
    deliveredTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    // Reactions (emoji)
    reactions: [ReactionSchema],
    // Edit history (MIKE system)
    editHistory: [
      {
        content: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
    isEdited: { type: Boolean, default: false },
    // Deletion
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Anti-delete: MIKE system retains original even if "deleted"
    originalContent: { type: String, default: '' },
    // View-once
    isViewOnce: { type: Boolean, default: false },
    viewedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    // Encryption flag
    isEncrypted: { type: Boolean, default: true },
    encryptionVersion: { type: String, default: 'v1' },
  },
  { timestamps: true }
);

// Index for fast chat queries
MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', MessageSchema);
