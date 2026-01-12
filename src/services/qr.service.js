const db = require("../db");

function getTableByQrToken(qrToken) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM tables WHERE qrToken = ?`, [qrToken], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

module.exports = { getTableByQrToken };
