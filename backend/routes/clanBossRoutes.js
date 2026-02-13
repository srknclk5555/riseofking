const express = require('express');
const router = express.Router();
const clanBossController = require('../controllers/clanBossController');
const authMiddleware = require('../middleware/auth');

router.post('/runs', authMiddleware, clanBossController.createClanBossRun);

// Clan üyelerini nickname ile birlikte getir
router.get('/members/:clanId', authMiddleware, clanBossController.getClanMembersWithNicknames);

// Clan'ın tüm boss run'larını getir
router.get('/runs/clan/:clanId', authMiddleware, clanBossController.getClanBossRuns);

// Tek bir run detayı
router.get('/runs/:id', authMiddleware, clanBossController.getClanBossRunDetails);

// Ödeme durumunu güncelle
router.patch('/runs/:runId/participants/:participantUserId/pay', authMiddleware, clanBossController.updateParticipantPayStatus);

// Kayıttan ayrıl (kendini çıkar)
router.delete('/runs/:runId/self', authMiddleware, clanBossController.removeSelfFromRun);

// Kayıttan başka bir kullanıcıyı çıkar (lider veya oluşturucu)
router.delete('/runs/:runId/participants/:participantUserId', authMiddleware, clanBossController.removeParticipantFromRun);

// Kaydı sil (sadece oluşturan)
router.delete('/runs/:id', authMiddleware, clanBossController.deleteClanBossRun);

module.exports = router;