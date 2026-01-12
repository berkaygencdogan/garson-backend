const pool = require("../db");
const { sendPushToTokens } = require("../utils/push");

exports.callWaiter = async (req, res) => {
  console.log("🚨 CALL WAITER CONTROLLER ÇALIŞTI");
  console.log("REQ.USER:", req.user);

  const { cafeId, tableId, userId } = req.user;

  if (!cafeId || !tableId) {
    return res.status(400).json({ error: "Cafe veya masa bulunamadı" });
  }

  try {
    // 1️⃣ DB'YE ÇAĞRI KAYDI
    const [result] = await pool.execute(
      `
      INSERT INTO calls (cafe_id, table_id, type, status)
      VALUES (?, ?, 'waiter', 'pending')
      `,
      [cafeId, tableId]
    );

    const callId = result.insertId;

    // 2️⃣ GARSON + ADMIN TOKENLARI
    const [rows] = await pool.execute(
      `
      SELECT push_token
      FROM users
      WHERE cafe_id = ?
        AND role IN ('admin', 'garson')
        AND push_token IS NOT NULL
      `,
      [cafeId]
    );

    const tokens = rows.map((r) => r.push_token);

    // 3️⃣ PUSH GÖNDER
    if (tokens.length) {
      await sendPushToTokens(tokens, {
        title: "🧑‍🍽️ Garson Çağrısı",
        body: `Masa ${tableId} garson çağırıyor`,
        data: {
          type: "CALL_WAITER",
          callId,
          tableId,
        },
      });
    }

    // 4️⃣ FRONTEND CEVAP
    res.json({ success: true, callId });
  } catch (err) {
    console.error("CALL WAITER ERROR:", err);
    res.status(500).json({ error: "Garson çağrılamadı" });
  }
};

// exports.callWaiterFromKitchen = async (req, res) => {
//   console.log("PARAMS:", req.params);
//   console.log("REQ.USER:", req.user);

//   const { cafeId } = req.user;
//   const { orderId } = req.params;

//   if (!cafeId || !orderId) {
//     return res.status(400).json({ error: "Eksik bilgi" });
//   }

//   try {
//     // 1️⃣ ORDER + MASA BİLGİSİ
//     const [[order]] = await pool.execute(
//       `
//       SELECT o.id, o.table_id, t.name AS table_name
//       FROM orders o
//       JOIN tables t ON t.id = o.table_id
//       WHERE o.id = ? AND o.cafe_id = ?
//       `,
//       [orderId, cafeId]
//     );

//     if (!order) {
//       return res.status(404).json({ error: "Sipariş bulunamadı" });
//     }

//     // 2️⃣ CALL KAYDI (MUTFAK → GARSON)
//     const [result] = await pool.execute(
//       `
//       INSERT INTO calls (cafe_id, table_id, type, status)
//       VALUES (?, ?, 'kitchen', 'pending')
//       `,
//       [cafeId, order.table_id]
//     );

//     const callId = result.insertId;

//     // 3️⃣ GARSON + ADMIN TOKENLARI
//     const [rows] = await pool.execute(
//       `
//       SELECT push_token
//       FROM users
//       WHERE cafe_id = ?
//         AND role IN ('admin', 'garson')
//         AND push_token IS NOT NULL
//       `,
//       [cafeId]
//     );

//     const tokens = rows.map((r) => r.push_token);
//     // 4️⃣ PUSH → MASA BİLGİLİ 🔥
//     if (tokens.length) {
//       await sendPushToTokens(tokens, {
//         title: "🍽️ Sipariş Hazır",
//         body: `${order.table_name} siparişi servise hazır`,
//         data: {
//           type: "ORDER_READY",
//           orderId,
//           tableId: order.table_id,
//           callId,
//         },
//       });
//     }

//     // 5️⃣ RESPONSE
//     res.json({ success: true, callId });
//   } catch (err) {
//     console.error("KITCHEN CALL ERROR:", err);
//     res.status(500).json({ error: "Mutfak çağrısı gönderilemedi" });
//   }
// };
exports.callWaiterFromKitchen = async (req, res) => {
  try {
    const cafeId = 1;
    // 3️⃣ GARSON + ADMIN TOKENLARI
    const [rows] = await pool.execute(
      `
  SELECT push_token
  FROM users
  WHERE cafe_id = ?
    AND role IN ('admin', 'garson')
    AND push_token IS NOT NULL
  `,
      [cafeId]
    );

    const tokens = rows.map((r) => r.push_token);

    // 4️⃣ PUSH → MUTFAK ÇAĞRISI 🔥
    if (tokens.length) {
      await sendPushToTokens(tokens, {
        title: "📣 Garson Çağrısı",
        body: "Mutfak garson çağırıyor",
        data: {
          type: "KITCHEN_CALL",
        },
      });
    }

    // 5️⃣ RESPONSE
    res.json({ success: true });
  } catch (err) {
    console.error("KITCHEN CALL ERROR:", err);
    res.status(500).json({ error: "Mutfak çağrısı gönderilemedi" });
  }
};
