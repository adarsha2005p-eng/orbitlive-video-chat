# OrbitLive - Worldwide Random 1-to-1 Video Chat

A modern, production-grade web application for real-time worldwide 1-to-1 video chatting, inspired by Azar and OmeTV. Users from anywhere around the globe can click **"Start Video Chat"**, get randomly paired via an intelligent matchmaking queue, and communicate through direct, encrypted peer-to-peer WebRTC video and audio calls.

---

## 🌟 Architecture Overview

```text
               Worldwide Users
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
      [Browser A]           [Browser B]
           │                     │
           │ HTTPS               │ HTTPS
           ▼                     ▼
     ┌─────────────────────────────────┐
     │         Vercel (Frontend)       │
     │      https://<app>.vercel.app   │
     │    React 18 + Vite + TypeScript │
     └────────────────┬────────────────┘
                      │
                      │ HTTPS API & WSS (Socket.IO)
                      ▼
     ┌─────────────────────────────────┐
     │      Render / Koyeb (Backend)   │
     │   https://<backend>.onrender.com│
     │   Node.js + Express + Socket.IO │
     └────────┬───────────────┬────────┘
              │               │
      Redis Protocol (TLS)    │ PostgreSQL Connection
              ▼               ▼
     ┌─────────────────┐  ┌──────────────────┐
     │  Upstash Redis  │  │  Neon PostgreSQL │
     │  (Match Queue & │  │  (Prisma Schema: │
     │  Online State)  │  │  Users, Reports, │
     └─────────────────┘  │  Blocks, Sessions│
                          └──────────────────┘
              ▲               ▲
              │               │
     ═════════╪═══════════════╪══════════════
              │ Direct P2P    │
              └───────────────┘
            WebRTC Media Stream
           (Encrypted SRTP/DTLS)
```

---

## 📁 1. Project Structure

```text
/
├── client/                     # Frontend (React 18 + Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Controls, Chat, Modals)
│   │   ├── pages/              # LandingPage and VideoChatPage
│   │   ├── hooks/              # useAuth, useWebRTC
│   │   ├── services/           # api.ts (Dual auth: cookies + Bearer token)
│   │   ├── socket/             # socket.ts (Socket.IO connection manager)
│   │   ├── webrtc/             # webrtc.ts (Native RTCPeerConnection wrapper)
│   │   ├── types/              # TypeScript definitions
│   │   ├── App.tsx             # Root page router
│   │   └── main.tsx            # React entry point
│   ├── vercel.json             # Vercel SPA routing rewrite rules
│   ├── .env.example            # Client environment variables
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend (Node.js + Express + TypeScript + Socket.IO)
│   ├── src/
│   │   ├── controllers/        # auth.controller.ts, moderation.controller.ts
│   │   ├── middleware/         # auth.middleware.ts (JWT cookie & header verification)
│   │   ├── routes/             # auth.routes.ts, moderation.routes.ts
│   │   ├── services/           # matchmaking.service.ts (Redis queue, session matching)
│   │   ├── socket/             # signaling.ts (WebRTC SDP/ICE relay, in-call chat)
│   │   ├── utils/              # prisma.ts, redis.ts (TLS support & memory fallback)
│   │   └── index.ts            # Server entry point (CORS, Rate Limiter, Helmet)
│   ├── prisma/
│   │   └── schema.prisma       # Prisma schema for standalone cloud builds
│   ├── .env.example            # Server environment variables
│   └── package.json
│
├── prisma/
│   └── schema.prisma           # Prisma models (User, Profile, Session, Report, Block)
├── render.yaml                 # Render Blueprint specification for free-tier deploy
├── vercel.json                 # Monorepo fallback Vercel configuration
├── docker-compose.yml          # Local containerized full-stack deployment
├── .env.example                # Monorepo environment variables template
└── README.md                   # Complete deployment & setup documentation
```

---

## ⚙️ 2. Production Environment Variables

### A. Vercel Frontend (`client`)
Configured in Vercel Dashboard -> **Settings** -> **Environment Variables**:

| Variable Key | Required Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://<your-backend>.onrender.com` | Public HTTPS URL of the deployed Express backend |
| `VITE_SOCKET_URL` | `https://<your-backend>.onrender.com` | Public WSS/HTTPS URL for Socket.IO signaling |

*(No `localhost` references are allowed in production).*

### B. Render Backend (`server`)
Configured in Render Dashboard -> **Environment**:

| Variable Key | Required Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port listened to by Node.js (`process.env.PORT`) |
| `NODE_ENV` | `production` | Enables secure cookies (`sameSite: 'none'`, `secure: true`) |
| `CLIENT_URL` | `https://<your-app>.vercel.app` | Allowed frontend origin for CORS and Socket.IO |
| `DATABASE_URL` | `postgresql://<user>:<password>@<host>/<db>?sslmode=require` | Neon PostgreSQL pooled connection string |
| `REDIS_URL` | `rediss://default:<password>@<host>:6379` | Upstash Redis connection string (with TLS `rediss://`) |
| `JWT_SECRET` | `32+_character_secure_random_string` | Secret key used to sign and verify user JWTs |
| `STUN_SERVERS` | `stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302` | Public Google STUN servers for NAT traversal |
| `TURN_SERVERS` | `""` | Optional TURN relay server URL(s) |
| `TURN_USERNAME`| `""` | Optional TURN username |
| `TURN_CREDENTIAL`| `""` | Optional TURN credential |

---

## 🚀 3. Step-by-Step Deployment Guide (₹0 Cost)

### Step 1: Database Setup (Neon PostgreSQL)
1. Register at [neon.tech](https://neon.tech) (Free, no credit card required).
2. Create a project named `orbitlive-db`.
3. Under **Connection Details**, ensure **Pooled connection** is checked.
4. Copy the connection string (`DATABASE_URL`).
5. Run the schema deployment from your local machine:
   ```bash
   npx prisma db push --schema=server/prisma/schema.prisma --accept-data-loss
   ```
6. Verify in the Neon console that tables `User`, `Profile`, `Session`, `Report`, and `Block` are created.

### Step 2: Redis Setup (Upstash Redis)
1. Register at [upstash.com](https://upstash.com) (Free, no credit card required).
2. Create a database named `orbitlive-redis`.
3. Ensure **TLS** is enabled.
4. Copy the `rediss://...` connection URL (`REDIS_URL`).

### Step 3: Backend Deployment (Render)
1. Push your repository to GitHub.
2. Log into [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Configure settings:
   * **Name**: `orbitlive-backend`
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   * `NODE_ENV`: `production`
   * `PORT`: `5000`
   * `DATABASE_URL`: *(your Neon connection string)*
   * `REDIS_URL`: *(your Upstash rediss:// URL)*
   * `JWT_SECRET`: *(a random 32+ character string)*
   * `CLIENT_URL`: `https://your-orbitlive.vercel.app` *(update once Vercel is deployed)*
   * `STUN_SERVERS`: `stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302`
6. Click **Create Web Service**.
7. Once deployed, test the health endpoint: `https://<your-backend>.onrender.com/api/health`.

### Step 4: Frontend Deployment (Vercel)
1. Log into [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. In configuration:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add **Environment Variables**:
   * `VITE_API_URL`: `https://<your-backend>.onrender.com`
   * `VITE_SOCKET_URL`: `https://<your-backend>.onrender.com`
5. Click **Deploy**.
6. Copy the assigned URL (e.g., `https://orbitlive-client.vercel.app`) and update the `CLIENT_URL` environment variable on Render.

---

## 📹 4. WebRTC Architecture & Direct P2P Guarantee

* **Real WebRTC Implementation**: Uses browser native `RTCPeerConnection`, `navigator.mediaDevices.getUserMedia()`, standard SDP offer/answer exchange, and ICE candidate trickling.
* **No Video/Audio on Backend**: The Node.js server only acts as a signaling broker (exchanging SDP descriptors and ICE candidates via Socket.IO). The media streams flow directly point-to-point between browsers with DTLS/SRTP encryption.
* **STUN/TURN**: Google STUN servers (`stun:stun.l.google.com:19302`) resolve public IP addresses for standard NAT traversal (~85% of connections). For strict corporate firewalls, a TURN relay can be plugged in via `TURN_SERVERS` environment variables without touching any application code.

---

## 🧪 5. Testing Two Users (Verification Workflow)

To verify the deployment between two real clients across the internet:

1. **Client A**:
   * Open Chrome and visit `https://your-orbitlive.vercel.app`.
   * Click **Start Video Chat**. Allow camera and microphone access.
   * Status displays: *"Finding someone from around the world..."*.
2. **Client B**:
   * Open a second browser (Incognito window, phone, or different computer) and visit `https://your-orbitlive.vercel.app`.
   * Click **Start Video Chat** and allow permissions.
3. **Verify**:
   * **Matchmaking**: Both clients match within 1-2 seconds with the same session ID.
   * **Video Feeds**: Stranger's video displays in large format; local webcam displays in the floating PiP window.
   * **In-Call Chat**: Click 💬, send a message from Client A, and confirm Client B receives it in real time.
   * **Controls**: Test 🎤 Mute, 📷 Camera Toggle, ⏭️ Next (disconnects and re-queues), and 🚫 Block (prevents future rematching).

---

## 📊 6. Official Current Free-Tier Limitations & Pricing (2026)

| Service | Provider | Current Free-Tier Specifications | Important Limitations & Behaviors |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** (Hobby) | • 100 GB bandwidth/month<br>• Fast Edge CDN<br>• Automatic SSL | ⚠️ **Non-Commercial Restriction**: Vercel Hobby is strictly for **personal/non-commercial use only**. Commercial use (charging users, running ads, affiliate marketing) requires upgrading to Vercel Pro ($20/month). |
| **Backend** | **Render** (Free Web Service) | • 512 MB RAM<br>• 0.1 vCPU<br>• 750 free instance hours/month<br>• Persistent WebSockets supported | ⚠️ **15-Minute Inactivity Spin-Down**: Free services spin down if no traffic or active WebSocket connections occur for 15 minutes. The first visit after spin-down incurs a **cold-start delay of ~30–60 seconds** while the instance spins back up. Active WebSocket connections keep the instance awake.<br>⚠️ **Instance Hours**: 750 hours/month is shared across all free services on your account. |
| **Database** | **Neon** (Free Tier) | • 0.5 GB (512 MB) storage<br>• 100 CU-hours compute/month<br>• Connection pooling included | ⚠️ **Scale-to-Zero**: Compute shuts down after 5 minutes of inactivity; auto-wakes in 1–2 seconds upon query.<br>⚠️ **No Overages**: If monthly compute or storage limits are exceeded, compute is suspended until the next monthly billing cycle. |
| **Redis** | **Upstash** (Free Tier) | • 500,000 commands/month<br>• 256 MB storage<br>• TLS enabled (`rediss://`) | ⚠️ **Request Cap**: Throttled if the monthly 500k command limit is reached. Pay-As-You-Go ($0.20 per 100k commands) can be enabled to handle higher throughput. |
| **STUN / TURN** | **Google STUN** | • Unlimited public STUN queries | ⚠️ **Symmetric NATs**: STUN cannot penetrate restrictive symmetric NATs or corporate firewalls (~15% of users). A TURN relay server (e.g. Metered.ca free 50 GB/month or self-hosted coturn) is required for those edge cases. |

---

## 💰 7. What Will Cost Money When User Count Grows

The free-tier architecture provides a ₹0 starting point for prototypes, portfolios, and small-scale testing. When transitioning to a commercial production business with active daily traffic:

1. **Always-On Backend Without Cold Starts**:
   * Upgrading Render to the **Starter Plan** ($7/month ~ ₹580/month) eliminates the 15-minute spin-down, ensuring instantaneous connections 24/7.
2. **Commercial Frontend License**:
   * Upgrading Vercel to **Pro** ($20/month ~ ₹1,650/month) satisfies Vercel's Terms of Service for commercial operations.
3. **Database Scaling**:
   * Neon **Launch Tier** ($19/month) provides 10 GB storage and 300 CU-hours for thousands of active users.
4. **TURN Relay Bandwidth**:
   * For the ~15% of users needing media relay across strict firewalls, Metered.ca or a dedicated $5/month VPS running coturn will handle TURN media traffic.
