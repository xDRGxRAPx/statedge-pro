import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchDoubleHistory, fetchCrashHistory } from "./services/supabase";
import { getWindows, calculateFrequency } from "./utils/frequency";
import { calculateDeviation } from "./utils/deviation";
import { detectEvents } from "./utils/events";
import { calculateScore } from "./utils/score";
import { analyzeCrash } from "./utils/crash";
import { generateSimulatedDouble, generateSimulatedCrash } from "./utils/simulate";
import { useBlazeSocket } from "./useBlazeSocket";
import type { HistoryItem } from "./utils/types";

import { ProbabilityCard } from "./components/game/ProbabilityCard";
import { FrequencyWindows } from "./components/game/FrequencyWindows";
import { EventsPanel } from "./components/game/EventsPanel";
import { HistoryList } from "./components/game/HistoryList";
import { CrashPanel } from "./components/game/CrashPanel";
import { AlertsBanner } from "./components/game/AlertsBanner";
import { StatusBar } from "./components/game/StatusBar";
import { DeviationCard } from "./components/game/DeviationCard";

type DataSource = "supabase" | "socket" | "simulado";
type ActiveTab = "double" | "crash";

function mergeHistory(
  base: HistoryItem[],
  incoming: HistoryItem[]
): HistoryItem[] {
  const seen = new Set(base.map((h) => h.id));
  const newItems = incoming.filter((h) => !seen.has(h.id));
  return [...base, ...newItems]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-220);
}

export default function App() {
  const [doubleHistory, setDoubleHistory] = useState<HistoryItem[]>(() =>
    generateSimulatedDouble(120)
  );
  const [crashHistory, setCrashHistory] = useState<HistoryItem[]>(() =>
    generateSimulatedCrash(100)
  );
  const [source, setSource] = useState<DataSource>("simulado");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("double");
  const [isLoading, setIsLoading] = useState(true);
  const simInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const blazeSocket = useBlazeSocket();

  // Load from Supabase
  const loadFromSupabase = useCallback(async () => {
    const [dbl, crash] = await Promise.all([
      fetchDoubleHistory(200),
      fetchCrashHistory(200),
    ]);
    if (dbl.length > 0 || crash.length > 0) {
      if (dbl.length > 0) setDoubleHistory(dbl);
      if (crash.length > 0) setCrashHistory(crash);
      setSource("supabase");
      setLastUpdate(new Date());
      return true;
    }
    return false;
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    loadFromSupabase().finally(() => setIsLoading(false));
  }, [loadFromSupabase]);

  // Poll Supabase every 5s
  useEffect(() => {
    const poll = setInterval(async () => {
      await loadFromSupabase();
    }, 5000);
    return () => clearInterval(poll);
  }, [loadFromSupabase]);

  // Socket.io data → merge into state
  useEffect(() => {
    if (blazeSocket.status !== "connected") return;
    if (blazeSocket.doubleRounds.length > 0) {
      const incoming: HistoryItem[] = blazeSocket.doubleRounds.map((r) => ({
        id: String(r.id),
        game_type: "double" as const,
        color: r.color,
        multiplier: null,
        created_at: r.createdAt,
      }));
      setDoubleHistory((prev) => mergeHistory(prev, incoming));
      setSource("socket");
      setLastUpdate(new Date());
    }
    if (blazeSocket.crashRounds.length > 0) {
      const incoming: HistoryItem[] = blazeSocket.crashRounds.map((r) => ({
        id: String(r.id),
        game_type: "crash" as const,
        color: null,
        multiplier: r.multiplier,
        created_at: r.createdAt,
      }));
      setCrashHistory((prev) => mergeHistory(prev, incoming));
    }
  }, [blazeSocket.status, blazeSocket.doubleRounds, blazeSocket.crashRounds]);

  // Simulation (only when no real data)
  useEffect(() => {
    if (source !== "simulado") {
      if (simInterval.current) {
        clearInterval(simInterval.current);
        simInterval.current = null;
      }
      return;
    }
    simInterval.current = setInterval(() => {
      const colors: Array<"red" | "black" | "white"> = ["red", "black", "white"];
      const weights = [0.475, 0.475, 0.05];
      const r = Math.random();
      let cumul = 0;
      let color: "red" | "black" | "white" = "black";
      for (let i = 0; i < colors.length; i++) {
        cumul += weights[i];
        if (r < cumul) { color = colors[i]; break; }
      }
      setDoubleHistory((prev) => {
        const next: HistoryItem = {
          id: `sim-d-${Date.now()}`,
          game_type: "double",
          color,
          multiplier: null,
          created_at: new Date().toISOString(),
        };
        return [...prev, next].slice(-220);
      });

      const rm = Math.random();
      const mult = rm < 0.55
        ? 1 + Math.random() * 0.5
        : rm < 0.80
        ? 1.5 + Math.random() * 1.5
        : rm < 0.95
        ? 3 + Math.random() * 7
        : 10 + Math.random() * 20;
      setCrashHistory((prev) => {
        const next: HistoryItem = {
          id: `sim-c-${Date.now()}`,
          game_type: "crash",
          color: null,
          multiplier: parseFloat(mult.toFixed(2)),
          created_at: new Date().toISOString(),
        };
        return [...prev, next].slice(-220);
      });
      setLastUpdate(new Date());
    }, 4000);
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, [source]);

  // --- Analytics (Double) ---
  const doubleWindows = useMemo(() => getWindows(doubleHistory), [doubleHistory]);
  const doubleFreq = useMemo(() => calculateFrequency(doubleHistory.slice(-100)), [doubleHistory]);
  const doubleDeviation = useMemo(() => calculateDeviation(doubleFreq), [doubleFreq]);
  const doubleEvents = useMemo(() => detectEvents(doubleHistory), [doubleHistory]);
  const doubleScore = useMemo(() => calculateScore(doubleFreq, doubleDeviation, doubleEvents), [doubleFreq, doubleDeviation, doubleEvents]);

  // --- Analytics (Crash) ---
  const crashAnalysis = useMemo(() => analyzeCrash(crashHistory), [crashHistory]);

  const totalRounds = doubleHistory.length + crashHistory.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#020617]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400">
              StatEdge Pro
            </p>
            <h1 className="text-lg font-bold text-white leading-tight">
              Análise Comportamental
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-800/60 rounded-xl p-1 gap-1">
            {(["double", "crash"] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-cyan-500 text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "double" ? "Double" : "Crash"}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                source === "simulado" ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span className="text-xs text-slate-500">
              {source === "supabase" ? "Supabase" : source === "socket" ? "WebSocket" : "Simulado"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* Status bar */}
        <StatusBar source={source} lastUpdate={lastUpdate} total={totalRounds} />

        {/* Alerts */}
        {activeTab === "double" && <AlertsBanner events={doubleEvents} />}

        {activeTab === "double" ? (
          <motion.div
            key="double"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {/* Col 1 */}
            <div className="space-y-4">
              <ProbabilityCard score={doubleScore} frequency={doubleFreq} />
              <DeviationCard deviation={doubleDeviation} />
            </div>

            {/* Col 2 */}
            <div className="space-y-4">
              <FrequencyWindows windows={doubleWindows} />
              <EventsPanel events={doubleEvents} />
            </div>

            {/* Col 3 */}
            <div className="space-y-4 md:col-span-2 xl:col-span-1">
              <HistoryList history={doubleHistory} limit={30} />
              <Disclaimer />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="crash"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <CrashPanel analysis={crashAnalysis} history={crashHistory} />
            </div>
            <div className="space-y-4">
              <CrashSequencePanel history={crashHistory} />
              <Disclaimer />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function CrashSequencePanel({ history }: { history: HistoryItem[] }) {
  const items = history
    .filter((h) => h.game_type === "crash" && h.multiplier !== null)
    .slice(-20)
    .reverse();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
        Últimos 20 Crash
      </h2>
      <div className="space-y-1.5">
        {items.map((item) => {
          const m = item.multiplier!;
          const isExplosive = m >= 10;
          const isHigh = m >= 3 && m < 10;
          const isMedium = m >= 1.5 && m < 3;

          const color = isExplosive
            ? "#ef4444"
            : isHigh
            ? "#f59e0b"
            : isMedium
            ? "#22d3ee"
            : "#475569";

          const bg = color + "12";
          const label = isExplosive
            ? "explosiva"
            : isHigh
            ? "alta"
            : isMedium
            ? "média"
            : "baixa";

          return (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg"
              style={{ background: bg, border: `1px solid ${color}20` }}
            >
              <span
                className="text-sm font-mono font-bold"
                style={{ color }}
              >
                {m.toFixed(2)}x
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color }}>
                {label}
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-slate-600 text-sm py-2">Sem histórico de crash</p>
        )}
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
      <p className="text-[10px] text-slate-600 leading-relaxed">
        ⚠️ Este dashboard é para <strong className="text-slate-500">análise estatística</strong> do histórico de jogadas. Não é previsão de resultados e não garante acerto. Jogue com responsabilidade.
      </p>
    </div>
  );
}
