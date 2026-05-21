/**
 * StatEdge Coletor — Double da Blaze → Supabase
 *
 * Estratégia de coleta (em ordem de prioridade):
 *  1. WebSocket (Socket.io) — tempo real, sem bloqueio geográfico
 *  2. API HTTP com polling — fallback quando WebSocket falha
 *
 * Nota: a API HTTP pode retornar 451 em IPs fora do Brasil.
 * Para produção, faça deploy em Railway/Render com região Brasil/Europa.
 */

const { io } = require("socket.io-client");
const { createClient } = require("@supabase/supabase-js");

// ---------- CONFIG ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TABLE = "double_results";
const POLL_INTERVAL_MS = 12000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[ERRO] SUPABASE_URL e SUPABASE_KEY são obrigatórias.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- HELPERS ----------

function mapColor(value) {
  const v = Number(value);
  if (v === 0 || value === "white") return "white";
  if (v === 1 || value === "red") return "red";
  if (v === 2 || value === "black") return "black";
  return String(value);
}

function log(msg) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

const savedIds = new Set();
let wsConnected = false;
let wsRoundsBuffer = [];

// ---------- SUPABASE ----------

async function loadExistingIds() {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id")
      .order("id", { ascending: false })
      .limit(500);
    if (error) throw error;
    (data || []).forEach((r) => savedIds.add(String(r.id)));
    log(`Cache: ${savedIds.size} IDs existentes.`);
  } catch (err) {
    log(`[AVISO] Cache não carregado: ${err.message}`);
  }
}

async function saveRounds(rounds) {
  const newRounds = rounds.filter((r) => r.id && !savedIds.has(String(r.id)));
  if (!newRounds.length) return 0;

  const rows = newRounds.map((r) => ({
    id: String(r.id),
    color: mapColor(r.color),
    number: r.roll ?? r.number ?? null,
    created_at: r.created_at ?? new Date().toISOString(),
  }));

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    rows.forEach((r) => savedIds.add(r.id));
    return rows.length;
  } catch (err) {
    log(`[ERRO] Falha ao salvar: ${err.message}`);
    return 0;
  }
}

// ---------- WEBSOCKET (Socket.io) ----------
// Blaze usa Socket.io para transmitir eventos do jogo em tempo real.
// Isso evita o bloqueio 451 da API HTTP.

const SOCKET_CANDIDATES = [
  "https://api-sockets.blaze.com",
  "https://api.blaze.com",
  "https://blaze.com",
];

function connectWebSocket() {
  let connected = false;

  for (const baseUrl of SOCKET_CANDIDATES) {
    try {
      const socket = io(baseUrl, {
        transports: ["websocket", "polling"],
        path: "/socket.io/",
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 10,
        timeout: 10000,
        extraHeaders: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          origin: "https://blaze.com",
        },
      });

      socket.on("connect", () => {
        log(`WebSocket conectado em ${baseUrl}`);
        wsConnected = true;

        // Assina os eventos do jogo Double
        socket.emit("subscribe", { room: "double_v2" });
        socket.emit("subscribe", { room: "roulette" });
        socket.emit("join", "double");
      });

      socket.on("disconnect", (reason) => {
        log(`WebSocket desconectado: ${reason}`);
        wsConnected = false;
      });

      socket.on("connect_error", (err) => {
        log(`WebSocket erro (${baseUrl}): ${err.message}`);
      });

      // Eventos de atualização do jogo
      const gameEvents = [
        "double.tick",
        "double.complete",
        "roulette.complete",
        "game.complete",
        "game.tick",
        "room.update",
        "round.complete",
      ];

      gameEvents.forEach((event) => {
        socket.on(event, (data) => {
          try {
            const round = extractRound(data);
            if (round) {
              wsRoundsBuffer.push(round);
              log(`WS evento "${event}": cor=${round.color} número=${round.number ?? "?"}`);
            }
          } catch { /* ignore */ }
        });
      });

      // Captura qualquer evento desconhecido que contenha dados de rodada
      socket.onAny((event, data) => {
        if (!gameEvents.includes(event) && data) {
          const round = extractRound(data);
          if (round) {
            wsRoundsBuffer.push(round);
            log(`WS evento genérico "${event}": cor=${round.color}`);
          }
        }
      });

      connected = true;
      return socket;
    } catch (err) {
      log(`WebSocket falhou em ${baseUrl}: ${err.message}`);
    }
  }

  if (!connected) {
    log("Nenhum endpoint WebSocket disponível — usando apenas polling HTTP.");
  }
  return null;
}

function extractRound(data) {
  if (!data) return null;

  // Diferentes formatos que a Blaze pode enviar
  const id = data.id ?? data.game_id ?? data.round_id;
  const color = data.color ?? data.result?.color ?? data.game?.color;
  const roll = data.roll ?? data.number ?? data.result?.roll ?? data.game?.roll;

  if (!id || color === undefined) return null;

  return {
    id: String(id),
    color: mapColor(color),
    number: roll ?? null,
    created_at: data.created_at ?? data.timestamp ?? new Date().toISOString(),
  };
}

// ---------- POLLING HTTP (fallback) ----------

async function collectViaHTTP() {
  const endpoints = [
    "https://blaze.com/api/roulette_games/recent",
    "https://blaze1.space/api/roulette_games/recent",
    "https://blazeapi.space/api/roulette_games/recent",
  ];

  const headers = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept: "application/json, text/plain, */*",
    "accept-language": "pt-BR,pt;q=0.9",
    origin: "https://blaze.com",
    referer: "https://blaze.com/pt/games/double",
  };

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 451) {
          log(`HTTP 451: IP bloqueado geograficamente em ${new URL(url).hostname}`);
        }
        continue;
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
      if (items.length) {
        log(`HTTP: ${items.length} rodadas capturadas de ${new URL(url).hostname}`);
        return items;
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        log(`HTTP erro (${url}): ${err.message}`);
      }
    }
  }
  return [];
}

// ---------- LOOP PRINCIPAL ----------

async function main() {
  log("========================================");
  log("  StatEdge Coletor — Double da Blaze");
  log("========================================");
  log(`Tabela: ${TABLE} | Polling: ${POLL_INTERVAL_MS / 1000}s`);
  log("Modo: WebSocket (tempo real) + HTTP (fallback)");

  await loadExistingIds();

  // Inicia conexão WebSocket em background
  const socket = connectWebSocket();

  let cycle = 0;
  let httpFailures = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    cycle++;
    log(`--- Ciclo #${cycle} | WS: ${wsConnected ? "conectado" : "offline"} ---`);

    try {
      let rounds = [];

      // 1. Drena o buffer do WebSocket
      if (wsRoundsBuffer.length > 0) {
        rounds = [...wsRoundsBuffer];
        wsRoundsBuffer = [];
        log(`WS buffer: ${rounds.length} rodadas`);
      }

      // 2. Fallback HTTP se WebSocket não tem dados suficientes
      if (rounds.length === 0 && httpFailures < 5) {
        const httpRounds = await collectViaHTTP();
        if (httpRounds.length) {
          rounds = httpRounds;
          httpFailures = 0;
        } else {
          httpFailures++;
          if (httpFailures >= 3 && !wsConnected) {
            log("AVISO: Tanto HTTP quanto WebSocket estão sem dados.");
            log("→ Para resolver: faça deploy em Railway/Render com região Brasil.");
            log("  railway.app → New Project → Deploy from GitHub → região South America");
          }
        }
      }

      if (rounds.length > 0) {
        const saved = await saveRounds(rounds);
        if (saved > 0) {
          log(`Salvo no banco: ${saved} novos registros.`);
        } else {
          log(`Sem novos registros (${rounds.length} checados).`);
        }
      } else if (!wsConnected && httpFailures >= 5) {
        log("IP bloqueado pela Blaze. Aguardando conexão WebSocket ou reconexão...");
        httpFailures = 0; // reset para tentar de novo em alguns ciclos
      }
    } catch (err) {
      log(`[ERRO GERAL] ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// Cleanup ao encerrar
process.on("SIGINT", () => {
  log("Encerrando coletor...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  log("Encerrando coletor...");
  process.exit(0);
});

main().catch((err) => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});
