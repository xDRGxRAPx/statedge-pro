"use strict";

// Tiny HTTP server so Koyeb keeps the service alive
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "blaze-collector" }));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[Health] HTTP server on port ${PORT}`);
});
