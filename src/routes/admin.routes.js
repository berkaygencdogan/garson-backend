const router = require("express").Router();
const { createTable } = require("../controllers/admin.controller");

router.post("/table", createTable);

module.exports = router;
