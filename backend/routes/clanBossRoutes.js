const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const clanBossController = require('../controllers/clanBossController');
const authMiddleware = require('../middleware/auth');

// Rate Limiter: Boss run oluşturma ve silme için dakikada max 10 istek
const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiter: Diğer yazma işlemleri için dakikada max 30 istek
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 🔒 Boss run oluşturma — klan üyesi kontrolü controller'da yapılıyor
router.post('/runs', authMiddleware, strictLimiter, clanBossController.createClanBossRun);

// Clan üyelerini nickname ile birlikte getir — authMiddleware ile korunuyor
router.get('/members/:clanId', authMiddleware, clanBossController.getClanMembersWithNicknames);

// Clan'ın tüm boss run'larını getir
router.get('/runs/clan/:clanId', authMiddleware, clanBossController.getClanBossRuns);

// Tek bir run detayı
router.get('/runs/:id', authMiddleware, clanBossController.getClanBossRunDetails);

// Toplu ödeme durumunu güncelle (Herkese Öde / Hepsini İptal Et)
router.patch('/runs/:runId/participants/bulk-pay', authMiddleware, writeLimiter, clanBossController.bulkUpdateAllPaymentStatus);

// Ödeme durumunu güncelle — lider/oluşturucu kontrolü controller'da
router.patch('/runs/:runId/participants/:participantUserId/pay', authMiddleware, writeLimiter, clanBossController.updateParticipantPayStatus);

// Kayıttan ayrıl (kendini çıkar)
router.delete('/runs/:runId/self', authMiddleware, writeLimiter, clanBossController.removeSelfFromRun);

// Kayıttan başka bir kullanıcıyı çıkar (lider veya oluşturucu)
router.delete('/runs/:runId/participants/:participantUserId', authMiddleware, writeLimiter, clanBossController.removeParticipantFromRun);

// Kaydı sil (sadece oluşturan) + rate limit ile bot koruması
router.delete('/runs/:id', authMiddleware, strictLimiter, clanBossController.deleteClanBossRun);

module.exports = router;