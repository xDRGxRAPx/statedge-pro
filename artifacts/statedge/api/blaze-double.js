export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/roulette_history?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(200).json({
        ok: false,
        source: "supabase",
        error: errorText,
      });
    }

    const data = await response.json();

    const mapped = data.map((item) => ({
      id: item.id,
      color: item.color,
      createdAt: item.created_at,
    }));

    return res.status(200).json({
      ok: true,
      source: "supabase",
      data: mapped,
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      source: "supabase",
      error: error.message,
    });
  }
}
