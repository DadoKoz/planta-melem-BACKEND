const express = require("express");
const app = express();
const PORT = 5002;

app.get("/test-email", (req, res) => {
  console.log("Test email ruta zove se!");
  res.send("Test email ruta radi!");
});

app.listen(PORT, () => {
  console.log(`Test server na http://localhost:${PORT}`);
});
