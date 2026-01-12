const pool = require("../db");
const { sendPushToTokens } = require("../utils/push");

/**
 * 📊 MUTFAK DASHBOARD
 */
exports.getKitchenDashboard = async (req, res) => {
  const { cafeId } = req.user;

  // 1️⃣ TÜM SİPARİŞLER
  const [orders] = await pool.execute(
    `
    SELECT 
      o.id,
      o.status,
      t.name AS table_name
    FROM orders o
    JOIN tables t ON t.id = o.table_id
    WHERE o.cafe_id = ?
    ORDER BY o.created_at DESC
    `,
    [cafeId]
  );

  // 2️⃣ ITEMLER
  const [items] = await pool.execute(
    `
    SELECT order_id, product_name, quantity
    FROM order_items
    `
  );

  // 3️⃣ ORDER + ITEMS MERGE
  const withItems = orders.map((o) => ({
    ...o,
    items: items.filter((i) => i.order_id === o.id),
  }));

  res.json({
    pending: withItems.filter((o) => o.status === "pending"),
    preparing: withItems.filter((o) => o.status === "preparing"),
    ready: withItems.filter((o) => o.status === "ready"),
  });
};

/**
 * 🔄 SİPARİŞ DURUMU GÜNCELLE
 */
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { cafeId } = req.user;

  await pool.execute(
    `
    UPDATE orders
    SET status = ?, updated_at = NOW()
    WHERE id = ?
    `,
    [status, id]
  );

  res.json({ success: true });

  // 🔔 READY → GARSONA PUSH
  if (status === "ready") {
    try {
      // Masa adını al
      const [[order]] = await pool.execute(
        `
        SELECT t.name AS table_name
        FROM orders o
        JOIN tables t ON t.id = o.table_id
        WHERE o.id = ?
        `,
        [id]
      );

      // Garson + admin tokenları
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

      if (tokens.length) {
        await sendPushToTokens(tokens, {
          title: "🍽️ Sipariş Hazır",
          body: `${order.table_name} servise hazır`,
          data: {
            type: "ORDER_READY",
            orderId: id,
          },
        });
      }
    } catch (err) {
      console.error("KITCHEN → GARSON PUSH ERROR:", err);
    }
  }
};
exports.callGarson = async (req, res) => {
  const { orderId } = req.params;
  const { cafeId } = req.user;

  res.json({ success: true });

  try {
    // 🪑 masa adı
    const [[order]] = await pool.execute(
      `
      SELECT t.name AS table_name
      FROM orders o
      JOIN tables t ON t.id = o.table_id
      WHERE o.id = ?
      `,
      [orderId]
    );

    // 🧑‍🍽️ garson + admin
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

    if (tokens.length) {
      await sendPushToTokens(tokens, {
        title: "📣 Garson Çağrısı",
        body: `${order.table_name} servise hazır`,
        data: {
          type: "CALL_GARSON",
          orderId,
        },
      });
    }
  } catch (err) {
    console.error("CALL GARSON PUSH ERROR:", err);
  }
};
