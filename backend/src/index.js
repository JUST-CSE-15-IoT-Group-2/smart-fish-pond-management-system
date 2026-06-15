require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./db');
const { initSocket } = require('./socket');

// ─── Routes ────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const controlRoutes = require('./routes/controls');
const settingsRoutes = require('./routes/settings');
const accountRoutes = require('./routes/account');

// ─── App Setup ─────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 5000;

// ─── Socket.IO ─────────────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

// Make io accessible inside route handlers via req.app.get('io')
app.set('io', io);
initSocket(io);

// ─── Global Middleware ─────────────────────────────────────────────────────
// Allow all origins — no CORS restrictions
app.use(cors());
app.options('*', cors()); // Handle preflight for all routes

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize()); // Passport is stateless (no sessions)

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/controls', controlRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/account', accountRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[FPMS Backend] Running on http://0.0.0.0:${PORT} (all interfaces)`);
    console.log(`[FPMS Backend] LAN accessible — use your machine's local IP, e.g. http://192.168.x.x:${PORT}`);
    console.log(`[FPMS Backend] WebSocket ready`);
    console.log(`[FPMS Backend] CORS: open to all origins`);
  });
});
