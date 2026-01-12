const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { getOrders, createOrder } = require("../controllers/orders.controller");

const router = express.Router();

router.get("/", auth(["admin", "garson", "mutfak"]), getOrders);
router.post("/create", auth(), createOrder);

module.exports = router;
