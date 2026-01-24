require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");

/* Node < 18 için fetch */
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ================= CONFIG ================= */

// 🔒 KAFE WIFI IP (MANUEL GİR)
const IP_ADDRESS = "31.223.98.208"; // <-- BURAYA KAFE DIŞ IP YAZ

const PORT = process.env.PORT || 3000;

/* ================= APP ================= */

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* ================= SESSION (WEB) ================= */

app.use(
  session({
    name: "coffee-session",
    secret: process.env.SESSION_SECRET || "coffee_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // HTTPS varsa true
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);

/* ================= DB ================= */

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

/* ================= UTILS ================= */

const getClientIp = (req) => {
  const fwd = req.headers["x-forwarded-for"];
  return fwd ? fwd.split(",")[0].trim() : req.socket.remoteAddress;
};

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

app.post("/auth", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username zorunlu" });
  }

  const [rows] = await pool.execute(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [username],
  );

  // ✅ USER VARSA → DB ID DÖN
  if (rows.length) {
    return res.json({
      userId: rows[0].id, // 🔥 ÖNEMLİ
      type: "login",
    });
  }

  // ✅ USER YOKSA → OLUŞTUR → DB ID DÖN
  const [result] = await pool.execute(
    "INSERT INTO users (username) VALUES (?)",
    [username],
  );

  res.json({
    userId: result.insertId, // 🔥 ÖNEMLİ
    type: "register",
  });
});

/* =================================================
   WIFI KONTROL (WEB / MÜŞTERİ)
================================================= */

app.get("/check-cafe-wifi", (req, res) => {
  const clientIp = getClientIp(req);
  const allowed = clientIp === IP_ADDRESS;

  if (allowed) {
    req.session.wifi_ok = true;
    req.session.ip = clientIp;
  }

  res.json({ allowed, clientIp });
});

/* =================================================
   MÜŞTERİ → GARSON (PENDING)
================================================= */

app.post("/push/register", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "token gerekli" });
  }

  try {
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
  } catch (err) {
    console.error("PUSH REGISTER ERROR:", err.message);
    res.status(500).json({ error: "push token kaydedilemedi" });
  }
});

app.post("/call-waiter-web", async (req, res) => {
  const clientIp = getClientIp(req);

  // 🔒 Wi-Fi kontrolü
  if (!req.session?.wifi_ok || req.session.ip !== clientIp) {
    return res.status(403).json({
      error: "Sadece kafe Wi-Fi’ından çağrı yapabilirsiniz",
    });
  }

  const { note } = req.body;

  // 🔴 AKTİF BEKLEYEN ÇAĞRI VAR MI?
  const [existing] = await pool.execute(
    `
    SELECT id
    FROM calls
    WHERE status = 'pending'
      AND type = 'waiter'
      AND ip_address = ?
    LIMIT 1
    `,
    [clientIp],
  );

  if (existing.length) {
    return res.status(409).json({
      error: "Garsonların önceki isteği kabul etmesini bekleyiniz",
    });
  }

  // ✅ YENİ ÇAĞRI OLUŞTUR
  await pool.execute(
    `
    INSERT INTO calls (type, status, note, ip_address)
    VALUES ('waiter', 'pending', ?, ?)
    `,
    [note || null, clientIp],
  );

  // 🔔 PUSH GÖNDER (opsiyonel ama sen istiyorsun)
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

/* =================================================
   GARSON DASHBOARD
================================================= */

app.get("/garson/dashboard", async (req, res) => {
  const garsonId = Number(req.headers["x-user-id"]);
  if (!garsonId) return res.status(400).json({ error: "x-user-id gerekli" });

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

app.post("/kitchen/call-waiter", async (req, res) => {
  console.log("🍳 KITCHEN CALL");

  try {
    const [rows] = await pool.execute(`
      SELECT token FROM push_tokens
    `);

    const tokens = rows.map((r) => r.token);

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
});

app.post("/garson/accept/:id", async (req, res) => {
  const callId = Number(req.params.id);
  console.log("Accepting call ID:", req.headers, callId);
  const garsonId = Number(req.headers["x-user-id"]);

  if (!garsonId) return res.status(400).json({ error: "x-user-id gerekli" });

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

/* ================= START ================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
