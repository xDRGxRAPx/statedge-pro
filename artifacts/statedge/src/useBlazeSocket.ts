import { useEffect, useRef, useState } from "react";

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

// Busca dados reais via proxy Vercel (sem CORS)
async function fetchProxy<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Proxy error");
  return json.data as T[];
}

export function useBlazeSocket(): BlazeSocketReturn {
  const [status, setStatus] = useState<BlazeSocketStatus>("connecting");
  const [endpoint, setEndpoint] = useState("/api/blaze-double");
  const [doubleRounds, setDoubleRounds] = useState<SocketDoubleRound[]>([]);
  const [crashRounds, setCrashRounds] = useState<SocketCrashRound[]>([]);
  const [lastDoubleRound, setLastDoubleRound] =
    useState<SocketDoubleRound | null>(null);
  const [lastCrashRound, setLastCrashRound] =
    useState<SocketCrashRound | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);

  async function loadData() {
    try {
      const [doubles, crashes] = await Promise.all([
        fetchProxy<SocketDoubleRound>("/api/blaze-double"),
        fetchProxy<SocketCrashRound>("/api/blaze-crash"),
      ]);

      if (doubles.length > 0) {
        setDoubleRounds(doubles.slice(-220));
        setLastDoubleRound(doubles[doubles.length - 1]);
      }

      if (crashes.length > 0) {
        setCrashRounds(crashes.slice(-220));
        setLastCrashRound(crashes[crashes.length - 1]);
      }

      setStatus("connected");
      setEndpoint("blaze.com (proxy)");
      failCountRef.current = 0;
    } catch (err) {
      failCountRef.current += 1;
      console.warn("Proxy falhou:", err);

      if (failCountRef.current >= 3) {
        // Após 3 falhas consecutivas, marca como bloqueado
        setStatus("blocked");
      } else {
        setStatus("disconnected");
      }
    }
  }

  useEffect(() => {
    // Carrega imediatamente
    loadData();

    // Atualiza a cada 15 segundos (dados reais da Blaze)
    intervalRef.current = setInterval(loadData, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
