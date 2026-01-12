const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  callWaiter,
  callWaiterFromKitchen,
} = require("../controllers/waiter.controller");

const router = express.Router();

/* 👤 Müşteri → Garson */
router.post("/call", auth(), callWaiter);

/* 🍳 Mutfak → Garson */
router.post("/call-from-kitchen/:orderId", auth(), callWaiterFromKitchen);

module.exports = router;
