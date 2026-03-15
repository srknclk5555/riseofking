const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getAllClans,
  getUserClans,
  createClan,
  getClanById,
  getClanMembers,
  addMembersToClan,
  removeMemberFromClan,
  applyToClan,
  updateClan,
  deleteClan,
  getAvailableUsers,
  getClanMessages,
  sendClanMessage,
  addClanACP,
  getDailyACP,
  getClanACPHistory,
  updateClanACP,
  deleteClanACP
} = require('../controllers/clanController');
const authMiddleware = require('../middleware/auth');

// Rate Limiter: Yazma işlemleri (POST/PUT/DELETE) için dakikada max 30 istek
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter: Başvuru ve toplu üye ekleme için dakikada max 10 istek
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

console.log('[DEBUG] Clans router loaded');

// Genel klan listesi — giriş zorunlu
router.get('/', authMiddleware, (req, res, next) => { console.log('[DEBUG] GET / clans'); next(); }, getAllClans);

// 🔒 AÇIK DÜZELTİLDİ: Token olmadan klan bilgisi alınamaz
router.get('/user/:userId', authMiddleware, getUserClans);

router.post('/', authMiddleware, writeLimiter, createClan);
router.post('/create', authMiddleware, writeLimiter, createClan);

// 🔒 authMiddleware eklendi — token olmadan 401 döner
router.get('/:id', authMiddleware, getClanById);

// Üye listesi — sadece klan üyeleri görebilir (controller'da da kontrol var)
router.get('/:clanId/members', authMiddleware, (req, res, next) => {
  console.log('[DEBUG] GET /:clanId/members');
  next();
}, getClanMembers);

// 🔒 AÇIK #3 DÜZELTİLDİ: controller'da lider/sahiplik kontrolü var + rate limit
router.post('/:clanId/members', authMiddleware, strictLimiter, (req, res, next) => { console.log('[DEBUG] POST /:clanId/members'); next(); }, addMembersToClan);
router.delete('/:clanId/member/:userId', authMiddleware, writeLimiter, removeMemberFromClan);
router.get('/:clanId/messages', authMiddleware, getClanMessages);
router.post('/:clanId/messages', authMiddleware, writeLimiter, sendClanMessage);

// ACP Rotaları
router.post('/:clanId/acp', authMiddleware, writeLimiter, addClanACP);
router.get('/:clanId/acp/daily', authMiddleware, getDailyACP);
router.get('/:clanId/acp/history', authMiddleware, getClanACPHistory);
router.put('/:clanId/acp/:id', authMiddleware, writeLimiter, updateClanACP);
router.delete('/:clanId/acp/:id', authMiddleware, writeLimiter, deleteClanACP);

// 🔒 AÇIK #4 DÜZELTİLDİ: Başvuru rate limit + controller'da token'dan userId alınıyor
router.post('/:id/apply', authMiddleware, strictLimiter, applyToClan);
router.put('/:id', authMiddleware, writeLimiter, updateClan);
router.delete('/:id', authMiddleware, writeLimiter, deleteClan);
router.get('/users/available-for-clan', authMiddleware, getAvailableUsers);

module.exports = router;