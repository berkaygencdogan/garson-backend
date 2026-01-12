const jwt = require("jsonwebtoken");

module.exports = function auth() {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "No token" });
    }

    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};
