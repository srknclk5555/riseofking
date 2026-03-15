const { generalLimiter, strictWriteLimiter } = require('../middleware/rateLimiter');

function checkLimiter(name, limiter) {
  if (!limiter || typeof limiter.keyGenerator !== 'function') {
    console.error(`[FAIL] ${name} için keyGenerator tanımlı değil veya fonksiyon değil.`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] ${name} keyGenerator tanımlı ve fonksiyon.`);
  }
}

checkLimiter('generalLimiter', generalLimiter);
checkLimiter('strictWriteLimiter', strictWriteLimiter);

