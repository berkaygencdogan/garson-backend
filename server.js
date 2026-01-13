require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT is not defined (Passenger did not set it)");
}

app.listen(PORT, "127.0.0.1", () => {
  console.log("🚀 Backend running on port", PORT);
});
