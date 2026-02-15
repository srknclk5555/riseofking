const express = require('express');
const router = express.Router();
const clanBankController = require('../controllers/clanBankController');
const authMiddleware = require('../middleware/auth');

// Tüm rotalar için yetkilendirme gerekli
router.use(authMiddleware);

// Banka bilgilerini getir
router.get('/:clanId', clanBankController.getClanBank);

// İtem satışı
router.post('/sell', clanBankController.sellItem);

// Ödeme yap
router.post('/pay', clanBankController.payParticipant);

// Manuel item ekle
router.post('/manual-item', clanBankController.addManualItem);

// İşlem geçmişi
router.get('/:clanId/transactions', clanBankController.getTransactions);

// Satılan itemler
router.get('/:clanId/sold', clanBankController.getSoldItems);

module.exports = router;
