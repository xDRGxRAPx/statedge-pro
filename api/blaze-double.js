const https = require("https");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(200).end();

  function fetch(path) {
    return new Promise((resolve, reject) => {
      const r = https.request(
        {
          hostname: "blaze.com",
          path,
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/json",
            Referer: "https://blaze.com/",
          },
          timeout: 8000,
        },
        (resp) => {
          let body = "";
          resp.on("data", (c) => (body += c));
          resp.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error("JSON invalido"));
            }
          });
        }
      );
      r.on("error", reject);
      r.on("timeout", () => {
        r.destroy();
        reject(new Error("Timeout"));
      });
      r.end();
    });
  }

  try {
    const data = await fetch("/api/roulette_games/recent");
    const rounds = Array.isArray(data) ? data : data?.data ?? [];
    const mapped = rounds.map((item) => ({
      id: Number(item.id),
      color:
        item.color === 0
          ? "white"
          : item.color === 1
          ? "red"
          : "black",
      createdAt: item.created_at ?? new Date().toISOString(),
    }));
    return res.status(200).json({ ok: true, data: mapped });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
};
