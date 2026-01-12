const pool = require("../db");
const { sendPushToTokens } = require("../utils/push");

/**
 * 📦 TÜM SİPARİŞLER (Admin / Garson / Mutfak)
 */
const getOrders = async (req, res) => {
  const { cafeId } = req.user;

  const [orders] = await pool.execute(
    `
    SELECT 
      o.id,
      o.status,
      o.total_price,
      o.created_at,
      t.name AS table_name
    FROM orders o
    JOIN tables t ON t.id = o.table_id
    WHERE o.cafe_id = ?
    ORDER BY o.created_at DESC
    `,
    [cafeId]
  );

  res.json(orders);
};

/**
 * 🧾 SİPARİŞ OLUŞTUR (Müşteri → Mutfak)
 */
const createOrder = async (req, res) => {
  const { cafeId, tableId } = req.user;
  const { items } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: "Sipariş boş olamaz" });
  }

  // 1️⃣ ORDER
  const [result] = await pool.execute(
    `
    INSERT INTO orders (cafe_id, table_id, status)
    VALUES (?, ?, 'pending')
    `,
    [cafeId, tableId]
  );

  const orderId = result.insertId;

  // 2️⃣ ORDER ITEMS
  for (const item of items) {
    await pool.execute(
      `
      INSERT INTO order_items (order_id, product_name, quantity, note)
      VALUES (?, ?, ?, ?)
      `,
      [orderId, item.name, item.qty, item.note || null]
    );
  }

  // 3️⃣ FRONTEND’E CEVAP
  res.json({ success: true, orderId });

  // 4️⃣ 🔔 MUTFAĞA PUSH
  try {
    const [rows] = await pool.execute(
      `
      SELECT push_token 
      FROM users
      WHERE role = 'admin'
      AND push_token IS NOT NULL
      `
    );

    const tokens = rows.map((r) => r.push_token);

    if (tokens.length) {
      await sendPushToTokens(tokens, {
        title: "🍳 Yeni Sipariş",
        body: `Masa ${tableId} yeni sipariş verdi`,
        data: {
          type: "NEW_ORDER",
          orderId,
          tableId,
        },
      });
    }
  } catch (err) {
    console.error("ORDER PUSH ERROR:", err);
  }
};

module.exports = {
  getOrders,
  createOrder,
};
