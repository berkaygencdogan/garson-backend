const pool = require("../db");
const getClientIp = require("../utils/getClientIp");
const { sendPushToTokens } = require("../utils/push");

exports.checkCafeWifi = async (req, res) => {
  console.log("CHECK SESSION ID:", req.sessionID);

  const clientIp = getClientIp(req);
  const [[cafe]] = await pool.execute("SELECT wifi_ip FROM cafes WHERE id = 1");

  console.log("DB wifi_ip:", JSON.stringify(cafe.wifi_ip));
  console.log("CLIENT ip :", JSON.stringify(clientIp));

  const allowed = clientIp.trim() === String(cafe.wifi_ip).trim();

  if (allowed) {
    req.session.wifi_ok = true;
    req.session.ip = clientIp;
  }

  res.json({ allowed });
};

/* 🔔 Garson çağır */
exports.callWaiterFromWeb = async (req, res) => {
  console.log("WEB CALL SESSION ID:", req.sessionID);
  console.log("WEB CALL SESSION:", req.session);
  const clientIp = getClientIp(req);
  if (!req.session) {
    return res.status(500).json({
      error: "Session sistemi aktif değil",
    });
  }

  if (!req.session.wifi_ok || req.session.ip !== clientIp) {
    return res.status(403).json({
      error: "Sadece kafe Wi-Fi’ından çağrı yapabilirsiniz",
    });
  }

  const { message } = req.body;
  if (!message || message.length < 3) {
    return res.status(400).json({ error: "Mesaj gerekli" });
  }

  const CAFE_ID = 1;

  await pool.execute(
    `INSERT INTO calls (cafe_id, type, status, note)
     VALUES (?, 'customer', 'pending', ?)`,
    [CAFE_ID, message]
  );

  const [rows] = await pool.execute(
    `SELECT push_token FROM users
     WHERE cafe_id = ?
     AND role IN ('admin','garson')
     AND push_token IS NOT NULL`,
    [CAFE_ID]
  );

  const tokens = rows.map((r) => r.push_token);

  if (tokens.length) {
    await sendPushToTokens(tokens, {
      title: "📣 Garson Çağrısı",
      body: message,
      data: { type: "WEB_CUSTOMER_CALL" },
    });
  }

  res.json({ success: true });
};
