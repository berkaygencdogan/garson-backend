require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const PORT = process.env.PORT || 3000;

/* ================= APP ================= */

const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API RUNNING");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    time: new Date().toISOString(),
  });
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

/* ================= PUSH ================= */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const sendPushToTokens = async (tokens, message) => {
  if (!tokens || !tokens.length) return;

  const payload = tokens.map((t) => ({
    to: t,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data || {},
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("PUSH ERROR:", err.message);
  }
};

/* ================= HEALTH ================= */

/* ================= AUTH ================= */

app.post("/auth", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username zorunlu" });
  }

  const [rows] = await pool.execute(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [username],
  );

  if (rows.length) {
    return res.json({
      userId: rows[0].id,
      type: "login",
    });
  }

  const [result] = await pool.execute(
    "INSERT INTO users (username) VALUES (?)",
    [username],
  );

  res.json({
    userId: result.insertId,
    type: "register",
  });
});

/* ================= PUSH REGISTER ================= */

app.post("/push/register", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token gerekli" });
  }

  await pool.execute(
    `
    INSERT INTO push_tokens (token)
    VALUES (?)
    ON DUPLICATE KEY UPDATE token = token
    `,
    [token],
  );

  console.log("📲 PUSH TOKEN KAYDEDİLDİ:", token);
  res.json({ success: true });
});

/* ================= WEB → GARSON ================= */

app.post("/call-waiter-web", async (req, res) => {
  const { note } = req.body;

  const [existing] = await pool.execute(
    `
    SELECT id
    FROM calls
    WHERE status = 'pending'
      AND type = 'waiter'
    LIMIT 1
    `,
  );

  if (existing.length) {
    return res.status(409).json({
      error: "Garsonların önceki isteği kabul etmesini bekleyiniz",
    });
  }

  await pool.execute(
    `
    INSERT INTO calls (type, status, note)
    VALUES ('waiter', 'pending', ?)
    `,
    [note || null],
  );

  const [rows] = await pool.execute(`SELECT token FROM push_tokens`);

  await sendPushToTokens(
    rows.map((r) => r.token),
    {
      title: "🛎️ Garson Çağrısı",
      body: "Yeni müşteri çağrısı var",
      data: { type: "WEB_CALL" },
    },
  );

  res.json({ success: true });
});

/* ================= GARSON DASHBOARD ================= */

app.get("/garson/dashboard", async (req, res) => {
  const garsonId = Number(req.headers["x-user-id"]);
  if (!garsonId) {
    return res.status(400).json({ error: "x-user-id gerekli" });
  }

  const [pending] = await pool.execute(
    `
    SELECT id, note, created_at
    FROM calls
    WHERE status = 'pending'
      AND type = 'waiter'
    ORDER BY created_at DESC
    `,
  );

  const [accepted] = await pool.execute(
    `
    SELECT id, note, accepted_at, created_at
    FROM calls
    WHERE acceptedBy = ?
    ORDER BY accepted_at DESC
    `,
    [garsonId],
  );

  res.json({ pending, accepted });
});

/* ================= GARSON ACCEPT ================= */

app.post("/garson/accept/:id", async (req, res) => {
  const callId = Number(req.params.id);
  const garsonId = Number(req.headers["x-user-id"]);

  if (!garsonId) {
    return res.status(400).json({ error: "x-user-id gerekli" });
  }

  const [result] = await pool.execute(
    `
    UPDATE calls
    SET status = 'accepted',
        acceptedBy = ?,
        accepted_at = NOW()
    WHERE id = ?
      AND status = 'pending'
    `,
    [garsonId, callId],
  );

  if (!result.affectedRows) {
    return res.status(400).json({
      error: "Çağrı zaten alınmış veya bulunamadı",
    });
  }

  res.json({ success: true });
});

/* ================= KITCHEN → GARSON ================= */

app.post("/kitchen/call-waiter", async (req, res) => {
  const [rows] = await pool.execute(`SELECT token FROM push_tokens`);

  await sendPushToTokens(
    rows.map((r) => r.token),
    {
      title: "📣 Garson Çağrısı",
      body: "Mutfak garson çağırıyor",
      data: { type: "KITCHEN_CALL" },
    },
  );

  res.json({ success: true });
});

/* ================= START ================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});

const KEEP_ALIVE_URL =
  process.env.KEEP_ALIVE_URL || "http://127.0.0.1:3000/health";

setInterval(
  async () => {
    try {
      const res = await fetch(KEEP_ALIVE_URL);
      console.log("🔄 Keep-alive ping:", res.status);
    } catch (err) {
      console.error("⚠️ Keep-alive error:", err.message);
    }
  },
  5 * 60 * 1000,
); // 5 dakika
