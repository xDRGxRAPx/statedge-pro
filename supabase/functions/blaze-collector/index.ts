import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseColor(n: number): string {
  if (n === 0) return "white";
  if (n === 1) return "red";
  return "black";
}

async function fetchDouble() {
  try {
    const res = await fetch(
      "https://blaze.com/api/roulette_games/recent?start_date=&end_date=&page=1",
      { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? data.data ?? []);
  } catch {
    return [];
  }
}

async function fetchCrash() {
  try {
    const res = await fetch(
      "https://blaze.com/api/crash_games/recent?start_date=&end_date=&page=1",
      { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items ?? data.data ?? []);
  } catch {
    return [];
  }
}

Deno.serve(async () => {
  let inserted = 0;
  const errors: string[] = [];

  try {
    const [doubleGames, crashGames] = await Promise.all([
      fetchDouble(),
      fetchCrash(),
    ]);

    for (const game of doubleGames.slice(0, 30)) {
      const { error } = await supabase.from("history").upsert(
        {
          id: String(game.id),
          game_type: "double",
          color: parseColor(Number(game.color ?? 2)),
          multiplier: null,
          created_at: game.created_at ?? new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (!error) inserted++;
      else errors.push(error.message);
    }

    for (const game of crashGames.slice(0, 30)) {
      const { error } = await supabase.from("history").upsert(
        {
          id: String(game.id),
          game_type: "crash",
          color: null,
          multiplier: parseFloat(
            String(game.crash_point ?? game.multiplier ?? "1")
          ),
          created_at: game.created_at ?? new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (!error) inserted++;
      else errors.push(error.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted,
        double: doubleGames.length,
        crash: crashGames.length,
        errors,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
