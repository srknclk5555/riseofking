const express = require('express');
const cors = require('cors');
const itemsRouter = require('./routes/items');
const pool = require('./config/database');
require('dotenv').config();
const helmet = require('helmet');
const { generalLimiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const authMiddleware = require('./middleware/auth');

const http = require('http');
const socketManager = require('./socket/socketManager');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
socketManager.initialize(server);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
// app.use(requestLogger);
// app.use(generalLimiter);

// Database pool middleware
app.use((req, res, next) => {
  req.dbPool = pool;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', itemsRouter);
app.use('/api/events', require('./routes/events'));
app.use('/api/farms', require('./routes/farms'));
app.use('/api/gathering', require('./routes/gathering'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/mobs', require('./routes/mobs'));
app.use('/api/clans', require('./routes/clans'));
app.use('/api/clan-boss', require('./routes/clanBossRoutes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/discord', require('./routes/discord'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Rise Online Tracker Backend API' });
});

server.listen(PORT, async () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor (Socket.io support enabled)`);

  // Test database connection on startup
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ PostgreSQL veritabanına başarıyla bağlandı');
  } catch (err) {
    console.error('✗ PostgreSQL bağlantı hatası:', err.message);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});