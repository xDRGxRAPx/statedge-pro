"use strict";

const { createClient } = require("@supabase/supabase-js");
const { io } = require("socket.io-client");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rrmxyoeqbllravvcloqu.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error("[Coletor] SUPABASE_KEY não definida. Configure a variável de ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SOCKET_URL = "https://api-v2.blaze.com";
const DOUBLE_ROOM = "double_room_1";
const CRASH_ROOM = "crash_room_4";

const seen = new Set();
let connected = false;
let doubleCount = 0;
let crashCount = 0;

function parseColor(n) {
  if (n === 0) return "white";
  if (n === 1) return "red";
  return "black";
}

async function saveDouble(payload) {
  const id = String(payload.id);
  if (seen.has(id)) return;
  seen.add(id);

  const color = parseColor(Number(payload.color ?? 2));
  const created_at = payload.created_at ?? new Date().toISOString();

  const { error } = await supabase.from("history").upsert(
    { id, game_type: "double", color, multiplier: null, created_at },
    { onConflict: "id" }
  );

  if (!error) {
    doubleCount++;
    console.log(`[Double] ${color.toUpperCase()} | total: ${doubleCount}`);
  } else {
    console.error("[Double] Erro ao salvar:", error.message);
  }
}

async function saveCrash(payload) {
  const id = String(payload.id);
  if (seen.has(id)) return;
  seen.add(id);

  const multiplier = parseFloat(payload.crash_point ?? payload.multiplier ?? "1");
  const created_at = payload.created_at ?? new Date().toISOString();

  const { error } = await supabase.from("history").upsert(
    { id, game_type: "crash", color: null, multiplier, created_at },
    { onConflict: "id" }
  );

  if (!error) {
    crashCount++;
    console.log(`[Crash]  ${multiplier.toFixed(2)}x | total: ${crashCount}`);
  } else {
    console.error("[Crash] Erro ao salvar:", error.message);
  }
}

function connect() {
  console.log(`[Coletor] Conectando ao servidor ${SOCKET_URL}...`);

  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    upgrade: false,
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: Infinity,
    timeout: 15000,
  });

  socket.on("connect", () => {
    connected = true;
    console.log("[Coletor] Conectado! Assinando salas...");
    socket.emit("cmd", { id: "subscribe", payload: { room: DOUBLE_ROOM } });
    socket.emit("cmd", { id: "subscribe", payload: { room: CRASH_ROOM } });
  });

  socket.on("disconnect", (reason) => {
    connected = false;
    console.warn(`[Coletor] Desconectado: ${reason}`);
  });

  socket.on("connect_error", (err) => {
    connected = false;
    console.error(`[Coletor] Erro de conexão: ${err.message}`);
  });

  socket.on("data", async (msg) => {
    if (!msg || !msg.payload) return;
    const { id, payload } = msg;

    if (id === DOUBLE_ROOM) {
      if (payload.status === "complete" || payload.status === "game_complete") {
        await saveDouble(payload);
      }
    }

    if (id === CRASH_ROOM) {
      if (
        payload.status === "game_over" ||
        payload.status === "complete" ||
        payload.status === "game_complete"
      ) {
        await saveCrash(payload);
      }
    }
  });
}

connect();

setInterval(() => {
  const status = connected ? "CONECTADO" : "DESCONECTADO";
  console.log(`[Status] ${status} | Double: ${doubleCount} | Crash: ${crashCount} | Cache: ${seen.size}`);
}, 60000);

process.on("SIGINT", () => {
  console.log("\n[Coletor] Encerrando...");
  process.exit(0);
});
