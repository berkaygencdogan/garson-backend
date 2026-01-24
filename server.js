require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

const HOST = process.env.RENDER ? "0.0.0.0" : undefined;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend running on ${HOST || "default"}:${PORT}`);
});
