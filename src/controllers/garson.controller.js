const pool = require("../db");

module.exports.getGarsonDashboard = async (req, res) => {
  const { cafeId, userId } = req.user;

  /* 🔔 BEKLEYEN ÇAĞRILAR (TÜM GARSONLAR) */
  const [pendingCalls] = await pool.execute(
    `
    SELECT 
      c.id,
      c.created_at,
      t.name AS table_name
    FROM calls c
    JOIN tables t ON t.id = c.table_id
    WHERE c.cafe_id = ?
      AND c.type = 'waiter'
      AND c.status = 'pending'
    ORDER BY c.created_at DESC
    `,
    [cafeId]
  );

  /* ✅ KABUL EDİLEN ÇAĞRILAR (SADECE BENİMKİLER) */
  const [acceptedCalls] = await pool.execute(
    `
    SELECT 
      c.id,
      c.created_at,
      t.name AS table_name,
      c.accepted_at
    FROM calls c
    JOIN tables t ON t.id = c.table_id
    WHERE c.cafe_id = ?
      AND c.type = 'waiter'
      AND c.status = 'accepted'
      AND c.accepted_by = ?
    ORDER BY c.accepted_at DESC
    `,
    [cafeId, userId]
  );

  res.json({
    pending: pendingCalls,
    accepted: acceptedCalls,
  });
};

/**
 * ✅ Çağrı Kabul
 */
module.exports.acceptCall = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; // garson id

  await pool.execute(
    `
    UPDATE calls
    SET 
      status = 'accepted',
      accepted_by = ?,
      accepted_at = NOW()
    WHERE id = ?
      AND status = 'pending'
    `,
    [userId, id]
  );

  res.json({ success: true });
};
