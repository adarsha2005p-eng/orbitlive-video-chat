import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import moderationRoutes from './routes/moderation.routes';
import { setupSignaling } from './socket/signaling';
import { checkDatabaseConnection } from './utils/prisma';
import { IceServerConfig } from './types';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable reverse proxy support (essential for Render, Koyeb, Railway, Cloudflare, etc.)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Parse configured client origins
const allowedOrigins = CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''));

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Mobile apps, curl, server-to-server
  const normalized = origin.replace(/\/+$/, '');

  // Match explicitly configured origins
  if (allowedOrigins.includes(normalized)) return true;

  // Match local development
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;

  // Match all Vercel deployments (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9_\-.]+\.vercel\.app$/.test(normalized)) return true;

  return false;
}

// 1. Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Production CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// 3. API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 4. Health Check (Vital for cloud hosting zero-downtime & monitoring)
app.get('/api/health', async (_req, res) => {
  const isDbConnected = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      server: 'running',
      database: isDbConnected ? 'connected' : 'standalone/memory_fallback',
    },
  });
});

// 5. WebRTC ICE Servers Configuration (STUN & TURN)
app.get('/api/config/ice-servers', (_req, res) => {
  const iceServers: IceServerConfig[] = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ];

  // Optional TURN server credentials from environment
  if (process.env.TURN_SERVERS) {
    const turnUrls = process.env.TURN_SERVERS.split(',').map((u) => u.trim());
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  res.json({ iceServers });
});

// 6. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/moderation', moderationRoutes);

// 7. Socket.IO Setup with Production CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by Socket.IO CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

// Initialize WebRTC and matchmaking signaling logic
setupSignaling(io);

// 8. Server Listen
server.listen(PORT, () => {
  console.log(`🚀 [Server] Video Chat Signaling & API Server running on port ${PORT}`);
  console.log(`🌐 [CORS] Allowed Origins: ${allowedOrigins.join(', ')} and *.vercel.app`);
  checkDatabaseConnection().then((connected) => {
    if (connected) {
      console.log('✅ [Database] PostgreSQL connected with Prisma.');
    } else {
      console.log('ℹ️ [Database] Running with in-memory adapter fallback for instant dev without setup.');
    }
  });
});

export { app, server, io };
