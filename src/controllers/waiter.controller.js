const pool = require("../db");
const { sendPushToTokens } = require("../utils/push");

exports.callWaiterFromKitchen = async (req, res) => {
  console.log("🚨 CALL WAITER FROM KITCHEN ÇALIŞTI");

  try {
    const cafeId = 1;

    const [rows] = await pool.execute(
      `
      SELECT push_token
      FROM users
      WHERE cafe_id = ?
        AND role IN ('admin', 'garson')
        AND push_token IS NOT NULL
      `,
      [cafeId],
    );

    const tokens = rows.map((r) => r.push_token);

    if (tokens.length) {
      await sendPushToTokens(tokens, {
        title: "📣 Garson Çağrısı",
        body: "Mutfak garson çağırıyor",
        data: { type: "KITCHEN_CALL" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("KITCHEN CALL ERROR:", err);
    res.status(500).json({ error: "Mutfak çağrısı gönderilemedi" });
  }
};
