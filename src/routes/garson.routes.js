const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getGarsonDashboard,
  acceptCall,
} = require("../controllers/garson.controller");

const router = express.Router();
router.get("/dashboard", auth(), getGarsonDashboard);
router.post("/accept/:id", auth(), acceptCall);

module.exports = router;
