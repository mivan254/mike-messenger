# 🔥 MIKE Messenger — Deployment Guide

## Overview

MIKE Messenger is split into three parts:
- **Backend** — Node.js + Express + Socket.io → Deploy to Render (free tier)
- **Frontend** — React SPA → Deploy to Vercel (free tier)
- **Database** — MongoDB Atlas (free tier, 512 MB)

---

## STEP 1: MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas and create a free account
2. Create a new **Free Cluster** (M0 Sandbox)
3. Choose a region close to your users
4. Under **Database Access** → Add a new database user:
   - Username: `mikeadmin`
   - Password: (generate a strong one, save it)
   - Role: `Atlas admin`
5. Under **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
6. Under **Databases** → Connect → **Connect your application** → Copy the connection string
   - It looks like: `mongodb+srv://mikeadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<password>` with your DB user password
   - Add the DB name: `mongodb+srv://mikeadmin:YOURPASS@cluster0.xxxxx.mongodb.net/mike_messenger?retryWrites=true&w=majority`

---

## STEP 2: Deploy Backend to Render

1. Push your code to GitHub (create a repo, push the whole `mike-messenger` folder)

2. Go to https://render.com and create a free account

3. Click **New +** → **Web Service**

4. Connect your GitHub repo

5. Configure:
   - **Name**: `mike-messenger-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

6. Add **Environment Variables** (under Advanced):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `MONGODB_URI` | *(your Atlas connection string)* |
   | `JWT_SECRET` | *(random 64-char string — use https://randomkeygen.com)* |
   | `JWT_EXPIRE` | `30d` |
   | `CLIENT_URL` | *(your Vercel frontend URL — fill after step 3)* |
   | `MAX_FILE_SIZE` | `10485760` |
   | `ENCRYPTION_KEY` | *(random 32-char string)* |

7. Click **Deploy**. Render will give you a URL like:
   `https://mike-messenger-backend.onrender.com`

   **Save this URL** — you need it for the frontend.

---

## STEP 3: Deploy Frontend to Vercel

1. Go to https://vercel.com and create a free account

2. Click **New Project** → Import your GitHub repo

3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Create React App`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | `https://mike-messenger-backend.onrender.com/api` |
   | `REACT_APP_SOCKET_URL` | `https://mike-messenger-backend.onrender.com` |
   | `REACT_APP_NAME` | `MIKE Messenger` |

5. Click **Deploy**. Vercel will give you a URL like:
   `https://mike-messenger.vercel.app`

---

## STEP 4: Update CORS on Backend

Go back to Render → your backend service → Environment Variables:
- Update `CLIENT_URL` to your Vercel URL: `https://mike-messenger.vercel.app`
- Click **Save Changes** — Render will redeploy automatically.

---

## STEP 5: Test Your Deployment

1. Open your Vercel URL in two different browsers (or incognito)
2. Register two different accounts
3. Search for the other user
4. Start a chat and send messages
5. You should see real-time delivery

---

## Running Locally (Development)

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone or extract the project
cd mike-messenger

# Install all dependencies
npm run install:all

# Backend setup
cd backend
cp .env.example .env
# Edit .env — fill in your MONGODB_URI and JWT_SECRET

# Frontend setup
cd ../frontend
cp .env.example .env
# Edit .env — set REACT_APP_API_URL=http://localhost:5000/api
#             set REACT_APP_SOCKET_URL=http://localhost:5000
```

### Start Development Servers

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd mike-messenger/backend
npm run dev
# Server starts at http://localhost:5000

# Terminal 2 — Frontend
cd mike-messenger/frontend
npm start
# App opens at http://localhost:3000
```

---

## Alternative: Railway Deployment (Backend)

Railway is another excellent free-tier option:

1. Go to https://railway.app
2. New Project → Deploy from GitHub repo
3. Select your repo, set root to `backend`
4. Add all the same environment variables as Render
5. Railway auto-detects Node.js and deploys

---

## Alternative: VPS Deployment (DigitalOcean / Linode)

For production-grade deployment on a $6/month VPS:

```bash
# On your VPS (Ubuntu 22.04)
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Clone your repo
git clone https://github.com/yourusername/mike-messenger.git
cd mike-messenger/backend

# Setup environment
cp .env.example .env
nano .env  # Fill in your values

# Install dependencies
npm install

# Start with PM2
pm2 start server.js --name mike-messenger-backend
pm2 save
pm2 startup

# For frontend — build and serve with nginx
cd ../frontend
npm install
npm run build

# Install nginx
sudo apt install nginx -y

# Copy build to nginx
sudo cp -r build/* /var/www/html/

# Configure nginx for SPA routing
# Edit /etc/nginx/sites-available/default:
# Add: try_files $uri /index.html;
sudo nginx -t && sudo systemctl reload nginx
```

---

## File Uploads in Production

By default, files are stored locally in `backend/uploads/`.  
For production, use **Cloudinary** or **AWS S3**:

### Cloudinary Integration (Recommended for free tier)

1. Create free account at https://cloudinary.com
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Replace `routes/upload.js` storage engine with Cloudinary storage
4. Add env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

---

## Troubleshooting

**Socket.io not connecting**
- Verify `CLIENT_URL` on backend exactly matches your frontend URL (no trailing slash)
- Check browser console for CORS errors
- Render free tier sleeps after 15 min inactivity — first connection may take 30s to wake

**MongoDB connection error**
- Check IP whitelist in Atlas → Network Access (should be `0.0.0.0/0`)
- Verify the connection string has your actual password, not `<password>`
- Check the database name at the end of the URI

**Messages not appearing in real-time**
- Check browser console for WebSocket errors
- Verify `REACT_APP_SOCKET_URL` points to backend (not the API URL)
- Socket.io will fall back to polling if WebSocket is blocked

**Render free tier limitations**
- Free services sleep after 15 minutes of inactivity
- Upgrade to Starter ($7/month) for always-on
- Or use Railway which has a more generous free tier

---

## Architecture Summary

```
Browser (React)
    │
    ├── REST API  ──────────────────→ Express (backend/routes/)
    │   (axios)                          │
    │                                    ├── MongoDB Atlas
    └── WebSocket ──────────────────→ Socket.io (backend/socket/)
        (socket.io-client)               │
                                         └── Broadcasts to room members
```

## Security Checklist for Production

- [ ] Strong `JWT_SECRET` (64+ random chars)
- [ ] Strong `ENCRYPTION_KEY` (32 chars)
- [ ] MongoDB Atlas IP whitelist (restrict to Render IPs in production)
- [ ] `NODE_ENV=production` set
- [ ] HTTPS enforced (Render/Vercel do this automatically)
- [ ] File upload size limits configured
- [ ] Rate limiting (add `express-rate-limit` to `server.js`)
