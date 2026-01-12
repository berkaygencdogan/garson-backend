const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { getMe, savePushToken } = require("../controllers/me.controller");

const router = express.Router();

router.get("/", auth(), getMe);
router.post("/push-token", auth(), savePushToken);

module.exports = router;
