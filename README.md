# 🔥 MIKE Messenger

A production-ready, real-time messaging platform built with Node.js, Socket.io, React, and MongoDB Atlas.

## Features

### Core Messaging
- ✅ Real-time 1-to-1 and group chat via WebSocket
- ✅ Message delivery & read receipts (✓ sent, ✓✓ delivered, blue ✓✓ read)
- ✅ Typing indicators
- ✅ Online/offline status with last seen
- ✅ Message timestamps & date dividers
- ✅ Edit messages (with edit history)
- ✅ Delete messages (soft delete)
- ✅ Reply to messages
- ✅ Emoji reactions
- ✅ File, image, video, audio sharing

### MIKE-Exclusive Features
- 🛡 **Anti-delete system** — original message content is always preserved server-side, recoverable by participants
- 🔒 **Chat lock vault** — PIN-protect individual chats
- 🗝 **View-once recovery** — MIKE system can recover view-once messages
- 🔐 **Encryption** — all messages flagged as encrypted (MEP v1)

### Privacy & Safety
- 🚫 Block users
- 🚨 Report users
- 🔑 JWT authentication
- 🔑 Bcrypt password hashing
- 🌐 CORS protection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Socket.io-client, Axios |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + Bcrypt |
| Realtime | WebSocket (Socket.io) |
| Hosting | Render (backend) + Vercel (frontend) |

## Quick Start

```bash
# Install dependencies
npm run install:all

# Configure environment files
cp backend/.env.example backend/.env   # Fill in MongoDB URI + JWT secret
cp frontend/.env.example frontend/.env  # Point to localhost backend

# Run development
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full cloud deployment instructions.

## Project Structure

```
mike-messenger/
├── backend/
│   ├── config/          # DB connection
│   ├── middleware/       # JWT auth middleware
│   ├── models/          # User, Message, Chat schemas
│   ├── routes/          # REST API routes
│   ├── socket/          # Socket.io event handlers
│   ├── uploads/         # Local file storage (dev)
│   └── server.js        # Entry point
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/  # Sidebar, ChatWindow, Settings
│       ├── contexts/    # AuthContext, ChatContext
│       ├── pages/       # Login, Register
│       └── services/    # API + Socket services
├── DEPLOYMENT.md
├── render.yaml          # Render deploy config
└── vercel.json          # Vercel deploy config
```
