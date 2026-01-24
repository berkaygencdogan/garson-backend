const express = require("express");
const { callWaiterFromKitchen } = require("../controllers/waiter.controller");

const router = express.Router();

/* 🍳 MUTFAK → GARSON */
router.post("/call-from-kitchen", callWaiterFromKitchen);

module.exports = router;
