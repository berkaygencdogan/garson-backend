const pool = require("../db");
const { sendPushToTokens } = require("../utils/push");

/* 1️⃣ Wi-Fi kontrol */
exports.checkCafeWifi = async (req, res) => {
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  console.log("🌐 CLIENT IP:", clientIp);

  const [rows] = await pool.execute(`SELECT wifi_ip FROM cafes WHERE id = 1`);

  const cafeIp = rows[0]?.wifi_ip;

  res.json({
    allowed: clientIp === cafeIp,
  });
};

/* 2️⃣ Web’den garson çağır */
exports.callWaiterFromWeb = async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim().length < 3) {
    return res.status(400).json({ error: "Mesaj gerekli" });
  }

  // ⚠️ Cafe ID burada sabit / env / config olabilir
  const CAFE_ID = 1;

  // çağrı kaydı (opsiyonel ama tavsiye)
  await pool.execute(
    `
    INSERT INTO calls (cafe_id, table_id, type, status, note)
    VALUES (?, NULL, 'customer', 'pending', ?)
    `,
    [CAFE_ID, message]
  );

  // garson + admin tokenları
  const [rows] = await pool.execute(
    `
    SELECT push_token
    FROM users
    WHERE cafe_id = ?
      AND role IN ('admin', 'garson')
      AND push_token IS NOT NULL
    `,
    [CAFE_ID]
  );

  const tokens = rows.map((r) => r.push_token);

  if (tokens.length) {
    await sendPushToTokens(tokens, {
      title: "📣 Garson Çağrısı",
      body: message,
      data: {
        type: "WEB_CUSTOMER_CALL",
      },
    });
  }

  res.json({ success: true });
};
