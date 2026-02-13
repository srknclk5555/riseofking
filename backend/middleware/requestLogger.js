module.exports = function requestLogger(req, res, next) {
  const start = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
  const userId = req.user?.id || null;
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      ip,
      userId
    };
    console.log(JSON.stringify(log));
  });
  next();
};