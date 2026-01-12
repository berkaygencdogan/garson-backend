const db = require("../db");
const uuid = require("../utils/uuid");

exports.callWaiter = (req, res) => {
  const { cafeId, tableId } = req.user;

  const callId = uuid();
  db.run(`INSERT INTO calls VALUES (?, ?, ?, ?, ?)`, [
    callId,
    cafeId,
    tableId,
    "garson",
    Date.now(),
  ]);

  res.json({ success: true });
};
