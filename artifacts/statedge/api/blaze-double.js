export default async function handler(req, res) {
  try {
    const response = await fetch("https://blaze.com/api/roulette_games/recent", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://blaze.com/"
      }
    });

    // ⚠️ TRATAMENTO DE BLOQUEIO
    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        blocked: true,
        status: response.status,
        message: "Blaze bloqueou a requisição"
      });
    }

    const data = await response.json();

    const mapped = data.map(item => ({
      id: Number(item.id),
      color:
        item.color === 0
          ? "white"
          : item.color === 1
          ? "red"
          : "black",
      createdAt: item.created_at
    }));

    return res.status(200).json({
      ok: true,
      data: mapped
    });

  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error.message
    });
  }
}
