const pool = require("../db");

exports.getMe = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, email, role FROM users WHERE id = ?",
    [req.user.userId]
  );
  res.json(rows[0]);
};

exports.savePushToken = async (req, res) => {
  const { token } = req.body;

  await pool.execute("UPDATE users SET push_token = ? WHERE id = ?", [
    token,
    req.user.userId,
  ]);

  res.json({ success: true });
};
