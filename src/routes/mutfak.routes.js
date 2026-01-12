const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getKitchenDashboard,
  updateOrderStatus,
  callGarson,
} = require("../controllers/mutfak.controller");

const router = express.Router();

router.get("/dashboard", auth(["admin", "mutfak"]), getKitchenDashboard);
router.post("/status/:id", auth(["admin", "mutfak"]), updateOrderStatus);
router.post("/call-garson/:orderId", auth(["admin", "mutfak"]), callGarson);

module.exports = router;
