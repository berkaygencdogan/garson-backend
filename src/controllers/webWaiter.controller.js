const pool = require("../db");
const { sendPushToTokens } = require("../utils/push");

/* 🔔 Garson çağır (HERKES ÇAĞIRABİLİR) */
exports.callWaiterFromWeb = async (req, res) => {
  const { message } = req.body;

  if (!message || message.length < 3) {
    return res.status(400).json({ error: "Mesaj gerekli" });
  }

  const CAFE_ID = 1;

  await pool.execute(
    `
    INSERT INTO calls (cafe_id, type, status, note)
    VALUES (?, 'customer', 'pending', ?)
    `,
    [CAFE_ID, message],
  );

  const [rows] = await pool.execute(
    `
    SELECT push_token
    FROM users
    WHERE cafe_id = ?
      AND role IN ('admin','garson')
      AND push_token IS NOT NULL
    `,
    [CAFE_ID],
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
