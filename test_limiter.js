const { generalLimiter, strictWriteLimiter } = require('./backend/middleware/rateLimiter');

console.log('Testing rateLimiter.js...');

if (typeof generalLimiter.getOptions === 'function') {
    const genOpts = generalLimiter.getOptions();
    console.log('generalLimiter keyGenerator:', genOpts.keyGenerator ? 'Present' : 'Missing');
} else {
    // If getOptions is not available, we can try to check if it's a function
    console.log('generalLimiter is loaded');
}

if (typeof strictWriteLimiter.getOptions === 'function') {
    const strictOpts = strictWriteLimiter.getOptions();
    console.log('strictWriteLimiter keyGenerator:', strictOpts.keyGenerator ? 'Present' : 'Missing');
} else {
    console.log('strictWriteLimiter is loaded');
}

console.log('\nVerifying other files via grep...');
// We'll use the tool for this instead of script for the other files
