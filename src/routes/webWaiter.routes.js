const express = require("express");
const {
  checkCafeWifi,
  callWaiterFromWeb,
} = require("../controllers/webWaiter.controller");

const router = express.Router();

/* 🌐 Web → Wi-Fi kontrol */
router.get("/check-wifi", checkCafeWifi);

/* 🌐 Web → Garson çağır */
router.post("/call", callWaiterFromWeb);

module.exports = router;
