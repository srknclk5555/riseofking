const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const clanBankController = require('../controllers/clanBankController');
const authMiddleware = require('../middleware/auth');
const clanBankValidator = require('../validators/clanBankValidator');

// Rate Limiter: Banka yazma işlemleri için dakikada max 30 istek
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => req.ip,
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Tüm rotalar için yetkilendirme gerekli
router.use(authMiddleware);

// Banka bilgilerini getir
router.get('/:clanId', clanBankController.getClanBank);

// İtem satışı
router.post('/sell', writeLimiter, clanBankValidator.sellItem, clanBankController.sellItem);

// Ödeme yap
router.post('/pay', writeLimiter, clanBankValidator.payParticipant, clanBankController.payParticipant);

// Toplu ödeme yap
router.post('/bulk-pay', writeLimiter, clanBankValidator.bulkPayParticipant, clanBankController.bulkPayParticipant);

// Manuel item ekle
router.post('/manual-item', writeLimiter, clanBankValidator.addManualItem, clanBankController.addManualItem);

// İşlem geçmişi
router.get('/:clanId/transactions', clanBankController.getTransactions);

// Üyenin ödenebilir runlarını getir
router.get('/:clanId/members/:userId/payable-runs', clanBankController.getMemberPayableRuns);

// Satılan itemler
router.get('/:clanId/sold', clanBankController.getSoldItems);

// Borç yönetimi
router.post('/debt', writeLimiter, clanBankController.updateClanDebt);

// Kasa yönetimi
router.post('/tax', writeLimiter, clanBankController.updateClanTax);

// Hazine işlemleri (Borç öde / Kasaya gönder)
router.post('/treasury-action', writeLimiter, clanBankValidator.processTreasuryAction, clanBankController.processTreasuryAction);

module.exports = router;
