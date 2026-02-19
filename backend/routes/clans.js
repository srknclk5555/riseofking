const express = require('express');
const router = express.Router();
const {
  getAllClans,
  getUserClans,
  createClan,
  getClanById,
  getClanMembers,
  addMembersToClan,
  removeMemberFromClan,  // Yeni fonksiyon
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

console.log('[DEBUG] Clans router loaded');

// Mevcut rotalar...
router.get('/', (req, res, next) => { console.log('[DEBUG] GET / clans'); next(); }, getAllClans);
router.get('/user/:userId', getUserClans);
router.post('/', authMiddleware, createClan);
router.post('/create', authMiddleware, createClan); // For backward compatibility
router.get('/:id', getClanById);
router.get('/:clanId/members', (req, res, next) => { console.log('[DEBUG] GET /:clanId/members'); next(); }, getClanMembers);
router.post('/:clanId/members', authMiddleware, (req, res, next) => { console.log('[DEBUG] POST /:clanId/members'); next(); }, addMembersToClan);
router.delete('/:clanId/member/:userId', authMiddleware, removeMemberFromClan); // Yeni rota
router.get('/:clanId/messages', authMiddleware, getClanMessages);
router.post('/:clanId/messages', authMiddleware, sendClanMessage);

// ACP Rotaları
router.post('/:clanId/acp', authMiddleware, addClanACP);
router.get('/:clanId/acp/daily', authMiddleware, getDailyACP);
router.get('/:clanId/acp/history', authMiddleware, getClanACPHistory);
router.put('/:clanId/acp/:id', authMiddleware, updateClanACP);
router.delete('/:clanId/acp/:id', authMiddleware, deleteClanACP);

router.post('/:id/apply', authMiddleware, applyToClan);
router.put('/:id', authMiddleware, updateClan);
router.delete('/:id', authMiddleware, deleteClan);
router.get('/users/available-for-clan', authMiddleware, getAvailableUsers);

module.exports = router;