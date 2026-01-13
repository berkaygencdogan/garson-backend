const getClientIp = require("../utils/getClientIp");

const rateMap = new Map();

module.exports = function webWaiterRateLimit(req, res, next) {
  const ip = getClientIp(req); // 🔥 BURASI KRİTİK
  const now = Date.now();

  const last = rateMap.get(ip) || 0;

  if (now - last < 30_000) {
    return res.status(429).json({
      error: "Çok sık çağrı yapıyorsunuz. Lütfen bekleyin.",
    });
  }

  rateMap.set(ip, now);
  next();
};
