const db = require("../db");
const uuid = require("../utils/uuid");

exports.createTable = (req, res) => {
  const { cafeId, name } = req.body;

  const tableId = uuid();
  const qrToken = uuid();

  db.run(`INSERT INTO tables VALUES (?, ?, ?, ?)`, [
    tableId,
    cafeId,
    name,
    qrToken,
  ]);

  res.json({
    tableId,
    qrUrl: `https://qr.garsonapp.com/join/${qrToken}`,
  });
};
