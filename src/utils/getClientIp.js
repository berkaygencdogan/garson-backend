module.exports = function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (req.headers["x-real-ip"]) {
    return req.headers["x-real-ip"];
  }

  if (req.headers["cf-connecting-ip"]) {
    return req.headers["cf-connecting-ip"];
  }

  return req.ip || req.socket.remoteAddress;
};
