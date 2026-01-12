const pool = require("../db");
const uuid = require("../utils/uuid");
const bcrypt = require("bcryptjs");
const { signToken } = require("../utils/jwt");

exports.register = async (req, res) => {
  const { email, password, tableId } = req.body;

  if (!email || !password || !tableId) {
    return res
      .status(400)
      .json({ error: "email, password ve tableId zorunlu" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const userId = uuid();

    // 📌 SABİT KAFE
    const cafeId = 1;

    await pool.execute(
      `
      INSERT INTO users (id, email, password, role, cafe_id, table_id)
      VALUES (?, ?, ?, 'user', ?, ?)
      `,
      [userId, email, hash, cafeId, tableId]
    );

    // 🔐 TOKEN (user objesi YOK, elimizdeki değerleri kullanıyoruz)
    const token = signToken({
      userId,
      role: "user",
      cafeId,
      tableId,
    });

    res.json({
      token,
      user: {
        id: userId,
        email,
        role: "user",
        cafeId,
        tableId,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Register failed" });
  }
};

exports.login = async (req, res) => {
  const { email, password, tableId } = req.body;

  if (!email || !password || !tableId) {
    return res.status(400).json({
      error: "email, password ve tableId zorunlu",
    });
  }

  const [rows] = await pool.execute(`SELECT * FROM users WHERE email = ?`, [
    email,
  ]);

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // 📌 KAFE SABİT
  const cafeId = 1;

  // 🔄 MASAYI GÜNCELLE
  await pool.execute(
    `
    UPDATE users
    SET table_id = ?, cafe_id = ?
    WHERE id = ?
    `,
    [tableId, cafeId, user.id]
  );

  // 🔐 TOKEN (YENİ MASA İLE)
  const token = signToken({
    userId: user.id,
    role: user.role,
    cafeId,
    tableId,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      cafeId,
      tableId,
    },
  });
};
