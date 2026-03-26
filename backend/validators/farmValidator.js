const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const farmValidator = {
  createFarm: [
    body('totalRevenue').isFloat({ min: 0 }).withMessage('Toplam gelir 0 veya daha büyük bir sayı olmalıdır'),
    body('sharePerPerson').isFloat({ min: 0 }).withMessage('Kişi başı pay 0 veya daha büyük bir sayı olmalıdır'),
    validateRequest
  ],
  updateFarm: [
    body('totalRevenue').optional().isFloat({ min: 0 }).withMessage('Toplam gelir 0 veya daha büyük bir sayı olmalıdır'),
    body('sharePerPerson').optional().isFloat({ min: 0 }).withMessage('Kişi başı pay 0 veya daha büyük bir sayı olmalıdır'),
    validateRequest
  ]
};

module.exports = farmValidator;
