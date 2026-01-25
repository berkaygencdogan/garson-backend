const express = require("express");
const { callWaiterFromWeb } = require("../controllers/webWaiter.controller");
const webWaiterRateLimit = require("../middlewares/webWaiterRateLimit");
const router = express.Router();
router.post("/call-waiter-web", webWaiterRateLimit, callWaiterFromWeb);

module.exports = router;
