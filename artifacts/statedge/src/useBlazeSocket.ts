import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type SocketDoubleRound = {
  id: number;
  color: "red" | "black" | "white";
  createdAt: string;
};

export type SocketCrashRound = {
  id: number;
  multiplier: number;
  createdAt: string;
};

export type BlazeSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "blocked"
  | "error";

type BlazeSocketReturn = {
  status: BlazeSocketStatus;
  endpoint: string;
  doubleRounds: SocketDoubleRound[];
  crashRounds: SocketCrashRound[];
  lastDoubleRound: SocketDoubleRound | null;
  lastCrashRound: SocketCrashRound | null;
};

const ENDPOINTS = [
  "https://api-v2.blaze.com",
  "https://api-gaming.blaze.com",
];

const DOUBLE_ROOM = "double_room_1";
const CRASH_ROOM = "crash_room_4";

function parseColor(c: unknown): "red" | "black" | "white" {
  const n = Number(c);
  if (n === 0) return "white";
  if (n === 1) return "red";
  return "black";
}

function makeSocket(url: string): Socket {
  return io(url, {
    transports: ["websocket"],
    upgrade: false,
    reconnection: false,
    timeout: 10000,
  });
}

export function useBlazeSocket(): BlazeSocketReturn {
  const [status, setStatus] = useState<BlazeSocketStatus>("connecting");
  const [endpoint, setEndpoint] = useState(ENDPOINTS[0]);
  const [doubleRounds, setDoubleRounds] = useState<SocketDoubleRound[]>([]);
  const [crashRounds, setCrashRounds] = useState<SocketCrashRound[]>([]);
  const [lastDoubleRound, setLastDoubleRound] =
    useState<SocketDoubleRound | null>(null);
  const [lastCrashRound, setLastCrashRound] =
    useState<SocketCrashRound | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const endpointIdxRef = useRef(0);
  const gaveUpRef = useRef(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (gaveUpRef.current) return;

      const url = ENDPOINTS[endpointIdxRef.current];
      setEndpoint(url);
      setStatus("connecting");

      const socket = makeSocket(url);
      socketRef.current = socket;

      socket.on("connect", () => {
        setStatus("connected");
        setEndpoint(url);

        socket.emit("cmd", {
          id: "subscribe",
          payload: { room: DOUBLE_ROOM },
        });
        socket.emit("cmd", {
          id: "subscribe",
          payload: { room: CRASH_ROOM },
        });

        socket.emit("cmd", {
          id: "history",
          payload: { room: DOUBLE_ROOM, page: 1 },
        });
        socket.emit("cmd", {
          id: "history",
          payload: { room: CRASH_ROOM, page: 1 },
        });
      });

      socket.on("disconnect", () => {
        if (gaveUpRef.current) return;
        setStatus("disconnected");
        reconnectTimer = setTimeout(() => {
          socket.disconnect();
          connect();
        }, 6000);
      });

      socket.on("connect_error", () => {
        socket.disconnect();
        if (gaveUpRef.current) return;

        const nextIdx = endpointIdxRef.current + 1;
        if (nextIdx < ENDPOINTS.length) {
          endpointIdxRef.current = nextIdx;
          reconnectTimer = setTimeout(connect, 2000);
        } else {
          gaveUpRef.current = true;
          setStatus("blocked");
        }
      });

      socket.on("data", (msg: unknown) => {
        if (!msg || typeof msg !== "object") return;
        const m = msg as Record<string, unknown>;
        const payload = m.payload as Record<string, unknown> | undefined;
        if (!payload) return;

        if (m.id === DOUBLE_ROOM) {
          if (
            payload.status === "complete" ||
            payload.status === "game_complete"
          ) {
            const round: SocketDoubleRound = {
              id: Number(payload.id ?? Date.now()),
              color: parseColor(payload.color),
              createdAt: String(
                payload.created_at ?? new Date().toISOString()
              ),
            };
            setLastDoubleRound(round);
            setDoubleRounds((prev) => {
              if (prev.some((r) => r.id === round.id)) return prev;
              return [...prev, round].slice(-220);
            });
          }

          if (Array.isArray(payload.records)) {
            const history: SocketDoubleRound[] = (
              payload.records as Array<Record<string, unknown>>
            )
              .map((item) => ({
                id: Number(item.id ?? Math.random()),
                color: parseColor(item.color),
                createdAt: String(
                  item.created_at ?? new Date().toISOString()
                ),
              }))
              .reverse();
            setDoubleRounds((prev) => {
              const merged = [...history, ...prev];
              const seen = new Set<number>();
              return merged
                .filter((r) => {
                  if (seen.has(r.id)) return false;
                  seen.add(r.id);
                  return true;
                })
                .slice(-220);
            });
          }
        }

        if (m.id === CRASH_ROOM) {
          if (
            payload.status === "game_over" ||
            payload.status === "complete" ||
            payload.status === "game_complete"
          ) {
            const raw = payload.crash_point ?? payload.multiplier ?? "1";
            const multiplier = Number(raw);
            const round: SocketCrashRound = {
              id: Number(payload.id ?? Date.now()),
              multiplier: isNaN(multiplier) ? 1 : multiplier,
              createdAt: String(
                payload.created_at ?? new Date().toISOString()
              ),
            };
            setLastCrashRound(round);
            setCrashRounds((prev) => {
              if (prev.some((r) => r.id === round.id)) return prev;
              return [...prev, round].slice(-220);
            });
          }

          if (Array.isArray(payload.records)) {
            const history: SocketCrashRound[] = (
              payload.records as Array<Record<string, unknown>>
            )
              .map((item) => {
                const raw = item.crash_point ?? item.multiplier ?? "1";
                return {
                  id: Number(item.id ?? Math.random()),
                  multiplier: isNaN(Number(raw)) ? 1 : Number(raw),
                  createdAt: String(
                    item.created_at ?? new Date().toISOString()
                  ),
                };
              })
              .reverse();
            setCrashRounds((prev) => {
              const merged = [...history, ...prev];
              const seen = new Set<number>();
              return merged
                .filter((r) => {
                  if (seen.has(r.id)) return false;
                  seen.add(r.id);
                  return true;
                })
                .slice(-220);
            });
          }
        }
      });
    }

    connect();

    return () => {
      gaveUpRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    status,
    endpoint,
    doubleRounds,
    crashRounds,
    lastDoubleRound,
    lastCrashRound,
  };
}
