const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const clanBankValidator = {
  sellItem: [
    body('itemId').isString().notEmpty().withMessage('İtem ID zorunludur'),
    body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalıdır'),
    body('saleAmount').isFloat({ min: 0.01 }).withMessage('Satış tutarı pozitif bir sayı olmalıdır'),
    validateRequest
  ],
  payParticipant: [
    body('participantUserId').isString().notEmpty().withMessage('Kullanıcı ID zorunludur'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Ödeme tutarı pozitif bir sayı olmalıdır'),
    body('runId').notEmpty().withMessage('Run ID zorunludur'),
    validateRequest
  ],
  bulkPayParticipant: [
    body('participantUserId').isString().notEmpty().withMessage('Kullanıcı ID zorunludur'),
    body('payments').isArray({ min: 1 }).withMessage('Ödemeler dizisi en az bir kayıt içermelidir'),
    body('payments.*.runId').notEmpty().withMessage('Her ödeme için Run ID zorunludur'),
    body('payments.*.amount').isFloat({ min: 0.01 }).withMessage('Her ödeme tutarı pozitif olmalıdır'),
    validateRequest
  ],
  addManualItem: [
    body('itemName').isString().notEmpty().withMessage('İtem adı zorunludur'),
    body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalıdır'),
    validateRequest
  ],
  processTreasuryAction: [
    body('amount').isFloat({ min: 0.01 }).withMessage('İşlem tutarı pozitif bir sayı olmalıdır'),
    body('actionType').isIn(['pay_debt', 'send_to_tax', 'treasury_spend']).withMessage('Geçersiz işlem tipi'),
    validateRequest
  ]
};

module.exports = clanBankValidator;
