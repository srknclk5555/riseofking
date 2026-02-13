const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const strictWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // write endpoints stricter
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, slow down.' }
});

module.exports = { generalLimiter, strictWriteLimiter };
