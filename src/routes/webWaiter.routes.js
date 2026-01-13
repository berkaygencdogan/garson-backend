const express = require("express");
const {
  checkCafeWifi,
  callWaiterFromWeb,
} = require("../controllers/webWaiter.controller");

const rateLimit = require("../middlewares/webWaiterRateLimit");

const router = express.Router();

router.get("/check-wifi", checkCafeWifi);
router.post("/call", rateLimit, callWaiterFromWeb);

module.exports = router;
