const express = require("express");
const cors = require("cors");
const session = require("express-session");

const meRoutes = require("./routes/me.routes");
const ordersRoutes = require("./routes/orders.routes");
const garsonRoutes = require("./routes/garson.routes");
const waiterRoutes = require("./routes/waiter.routes");
const authRoutes = require("./routes/auth.routes");
const mutfakRoutes = require("./routes/mutfak.routes");
const webWaiterRoutes = require("./routes/webWaiter.routes");

const app = express();

app.use(
  cors({
    origin: "https://test.coffeeinnterrace.com",
    credentials: true,
  })
);

app.use(express.json());
app.set("trust proxy", 1); // Render + HTTPS için ŞART

app.use(
  session({
    name: "garson.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // 🔴 HTTPS
      sameSite: "none", // 🔴 CROSS-DOMAIN ŞART
      maxAge: 30 * 60 * 1000,
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/garson", garsonRoutes);
app.use("/api/waiter", waiterRoutes);
app.use("/api/mutfak", mutfakRoutes);
app.use("/api/web-waiter", webWaiterRoutes);

module.exports = app;
