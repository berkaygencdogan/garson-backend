const router = require("express").Router();
const { callWaiter } = require("../controllers/call.controller");
const auth = require("../middleware/auth.middleware");

router.post("/waiter", auth, callWaiter);

module.exports = router;
