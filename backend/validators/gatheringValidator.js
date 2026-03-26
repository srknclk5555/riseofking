const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const gatheringValidator = {
  createLog: [
    body('itemName').notEmpty().withMessage('İtem adı zorunludur'),
    body('profession').notEmpty().withMessage('Meslek zorunludur'),
    body('date').isISO8601().withMessage('Geçerli bir tarih giriniz'),
    body('count').isInt({ min: 0 }).withMessage('Miktar (count) 0 veya daha büyük bir tam sayı olmalıdır'),
    body('price').isFloat({ min: 0 }).withMessage('Fiyat 0 veya daha büyük bir sayı olmalıdır'),
    body('duration').isFloat({ min: 0 }).withMessage('Süre 0 veya daha büyük bir sayı olmalıdır'),
    validateRequest
  ],
  updateLog: [
    body().custom((value, { req }) => {
      if (req.body.count === undefined && req.body.price === undefined && req.body.duration === undefined) {
        throw new Error('En az bir alan (count, price veya duration) güncellenmelidir');
      }
      return true;
    }),
    body('count').optional().isInt({ min: 0 }).withMessage('Miktar (count) 0 veya daha büyük bir tam sayı olmalıdır'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Fiyat 0 veya daha büyük bir sayı olmalıdır'),
    body('duration').optional().isFloat({ min: 0 }).withMessage('Süre 0 veya daha büyük bir sayı olmalıdır'),
    validateRequest
  ]
};

module.exports = gatheringValidator;
