import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBlazeSocket } from "./useBlazeSocket";

type Plan = "free" | "pro" | "elite";
type Color = "red" | "black" | "white";
type Priority = "high" | "medium" | "low";
type Section =
  | "dashboard"
  | "double"
  | "crash"
  | "estrategias"
  | "ia"
  | "simulator"
  | "alerts"
  | "settings";

type DoubleRound = {
  id: number;
  color: Color;
  createdAt: string;
};

type CrashRound = {
  id: number;
  multiplier: number;
  createdAt: string;
};

type AlertItem = {
  id: number;
  priority: Priority;
  title: string;
  text: string;
  createdAt: string;
  read: boolean;
};

type SimulatorResult = {
  strategy: string;
  finalBankroll: number;
  hitRate: number;
  maxDrawdown: number;
  pnl: number;
  curve: number[];
};

type StrategySignal = {
  color: Color;
  strength: "forte" | "medio" | "fraco";
  pattern: string;
  probability: number;
  description: string;
  lastSeen: number;
};

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: ["dashboard", "double", "crash", "estrategias", "alerts"],
  pro: ["dashboard", "double", "crash", "estrategias", "alerts", "ia", "simulator"],
  elite: ["dashboard", "double", "crash", "estrategias", "alerts", "ia", "simulator", "api"],
};

const SECTIONS: { id: Section; label: string; required: Plan }[] = [
  { id: "dashboard", label: "Overview", required: "free" },
  { id: "double", label: "Double", required: "free" },
  { id: "crash", label: "Crash", required: "free" },
  { id: "estrategias", label: "Estratégias", required: "free" },
  { id: "ia", label: "IA Advisor", required: "pro" },
  { id: "simulator", label: "Simulador", required: "pro" },
  { id: "alerts", label: "Alertas", required: "free" },
  { id: "settings", label: "Configuracoes", required: "free" },
];

function randomColor(): Color {
  const r = Math.random();
  if (r < 0.47) return "red";
  if (r < 0.94) return "black";
  return "white";
}

function makeDoubleRounds(count: number): DoubleRound[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    color: randomColor(),
    createdAt: new Date(Date.now() - (count - i) * 22000).toISOString(),
  }));
}

function makeCrashRounds(count: number): CrashRound[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    multiplier: Number((1 + Math.random() * Math.random() * 16).toFixed(2)),
    createdAt: new Date(Date.now() - (count - i) * 18000).toISOString(),
  }));
}

function movingAverage(values: number[], window: number): number {
  if (!values.length) return 0;
  const last = values.slice(-window);
  return last.reduce((acc, n) => acc + n, 0) / last.length;
}

function analyzeDouble(rounds: DoubleRound[]) {
  const recent = rounds.slice(-60);
  const total = recent.length || 1;
  const counts = recent.reduce(
    (acc, cur) => {
      acc[cur.color] += 1;
      return acc;
    },
    { red: 0, black: 0, white: 0 }
  );

  let longestStreak = 1;
  let streak = 1;
  let alternations = 0;
  const patternBreaks: number[] = [];

  for (let i = 1; i < recent.length; i += 1) {
    if (recent[i].color === recent[i - 1].color) {
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      if (streak >= 4) patternBreaks.push(i);
      streak = 1;
      alternations += 1;
    }
  }

  const alternationRatio = alternations / Math.max(1, recent.length - 1);
  const dominantColor = (
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "red"
  ) as Color;
  const dominance = (counts[dominantColor] / total) * 100;
  const whitePressure = counts.white / total;
  const opportunityScore = Math.min(
    100,
    Math.round(
      30 +
        dominance * 0.7 +
        longestStreak * 4 +
        alternationRatio * 20 -
        whitePressure * 35
    )
  );

  return {
    counts,
    longestStreak,
    alternationRatio,
    patternBreaks,
    dominantColor,
    dominance,
    opportunityScore,
  };
}

function analyzeCrash(rounds: CrashRound[]) {
  const recent = rounds.slice(-80);
  const values = recent.map((r) => r.multiplier);
  const maShort = movingAverage(values, 8);
  const maLong = movingAverage(values, 20);
  const highPeaks = values.filter((v) => v >= 10).length;
  const lowBand = values.filter((v) => v < 2).length;
  const volatility = Number(
    (
      movingAverage(
        values.map((v) => Math.abs(v - maShort)),
        12
      ) || 0
    ).toFixed(2)
  );
  const momentum = maShort - maLong;
  const confidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(55 + momentum * 8 - volatility * 2 + highPeaks)
    )
  );

  return {
    maShort,
    maLong,
    highPeaks,
    lowBand,
    volatility,
    momentum,
    confidence,
  };
}

// ---------- ESTRATÉGIAS ANALYSIS ----------

function analyzeStrategies(rounds: DoubleRound[]): {
  redProb: number;
  blackProb: number;
  whiteProb: number;
  signals: StrategySignal[];
  currentStreak: { color: Color; length: number };
  nextPrediction: Color;
  nextConfidence: number;
  patterns: { name: string; detected: boolean; strength: number }[];
} {
  const recent = rounds.slice(-100);
  const last20 = rounds.slice(-20);
  const last10 = rounds.slice(-10);
  const last5 = rounds.slice(-5);
  const total = last20.length || 1;

  // Base probabilities from last 20 rounds
  const counts20 = last20.reduce(
    (acc, r) => { acc[r.color]++; return acc; },
    { red: 0, black: 0, white: 0 }
  );

  const redProb = Math.round((counts20.red / total) * 100);
  const blackProb = Math.round((counts20.black / total) * 100);
  const whiteProb = Math.round((counts20.white / total) * 100);

  // Current streak detection
  let currentStreakColor = last5[last5.length - 1]?.color ?? "red";
  let currentStreakLen = 0;
  for (let i = last5.length - 1; i >= 0; i--) {
    if (last5[i].color === currentStreakColor) currentStreakLen++;
    else break;
  }

  // Pattern detection
  const isZigzag = last10.every((r, i) => i === 0 || r.color !== last10[i - 1].color);
  const isRepeat = last10.slice(-4).every(r => r.color === last10[last10.length - 1].color);
  const isABPattern = last10.length >= 6 && last10.slice(-6).every((r, i) => {
    const base = last10[last10.length - 6];
    const alt = last10[last10.length - 5];
    return r.color === (i % 2 === 0 ? base.color : alt.color);
  });
  const doubleAlternate = last10.length >= 4 && (() => {
    let ok = true;
    for (let i = 0; i < last10.length - 2; i++) {
      if (last10[i].color !== last10[i + 2].color) { ok = false; break; }
    }
    return ok;
  })();

  // Streak-based reversal signal
  const streakReversalSignal: StrategySignal | null = currentStreakLen >= 4
    ? {
        color: currentStreakColor === "red" ? "black" : currentStreakColor === "black" ? "red" : "red",
        strength: currentStreakLen >= 6 ? "forte" : "medio",
        pattern: `Reversão após ${currentStreakLen}x ${currentStreakColor === "red" ? "Vermelho" : currentStreakColor === "black" ? "Preto" : "Branco"}`,
        probability: Math.min(75, 40 + currentStreakLen * 6),
        description: `Sequência de ${currentStreakLen} rodadas seguidas. Pressão estatística de reversão.`,
        lastSeen: 0,
      }
    : null;

  // Zigzag pattern signal
  const zigzagSignal: StrategySignal | null = isZigzag && last10.length >= 6
    ? {
        color: last10[last10.length - 1].color === "red" ? "black" : "red",
        strength: "medio",
        pattern: "Padrão Zigzag Detectado",
        probability: 62,
        description: "Alternância regular entre cores. Alta probabilidade de continuidade do padrão.",
        lastSeen: 0,
      }
    : null;

  // Dominant color signal
  const dominantInRecent = Object.entries(counts20).sort((a, b) => b[1] - a[1])[0];
  const dominantProb = (dominantInRecent[1] / total) * 100;
  const dominantSignal: StrategySignal | null = dominantProb >= 60
    ? {
        color: dominantInRecent[0] as Color,
        strength: dominantProb >= 70 ? "forte" : "medio",
        pattern: "Tendência Dominante",
        probability: Math.round(dominantProb),
        description: `${dominantInRecent[0] === "red" ? "Vermelho" : dominantInRecent[0] === "black" ? "Preto" : "Branco"} apareceu em ${Math.round(dominantProb)}% das últimas 20 rodadas.`,
        lastSeen: 0,
      }
    : null;

  // White pressure signal
  const whiteInLast30 = recent.slice(-30).filter(r => r.color === "white").length;
  const whiteSignal: StrategySignal | null = whiteInLast30 <= 1
    ? {
        color: "white",
        strength: "medio",
        pattern: "Pressão Branca Acumulada",
        probability: Math.min(45, 20 + (3 - whiteInLast30) * 8),
        description: "Branco ausente por muitas rodadas. Probabilidade acima da média histórica.",
        lastSeen: whiteInLast30,
      }
    : null;

  // Repeat block signal
  const repeatSignal: StrategySignal | null = isRepeat
    ? {
        color: last10[last10.length - 1].color,
        strength: "fraco",
        pattern: "Bloco de Repetição",
        probability: 45,
        description: "Mesma cor repetindo em bloco. Pode continuar ou reverter a qualquer momento.",
        lastSeen: 0,
      }
    : null;

  const signals: StrategySignal[] = [
    streakReversalSignal,
    zigzagSignal,
    dominantSignal,
    whiteSignal,
    repeatSignal,
  ].filter((s): s is StrategySignal => s !== null);

  // Next prediction
  const topSignal = signals.sort((a, b) => b.probability - a.probability)[0];
  const nextPrediction: Color = topSignal ? topSignal.color : (Math.random() < 0.47 ? "red" : "black");
  const nextConfidence = topSignal ? topSignal.probability : 47;

  return {
    redProb,
    blackProb,
    whiteProb,
    signals,
    currentStreak: { color: currentStreakColor, length: currentStreakLen },
    nextPrediction,
    nextConfidence,
    patterns: [
      { name: "Zigzag", detected: isZigzag, strength: isZigzag ? 85 : 20 },
      { name: "Repetição em bloco", detected: isRepeat, strength: isRepeat ? 70 : 15 },
      { name: "Padrão AB", detected: isABPattern, strength: isABPattern ? 75 : 10 },
      { name: "Duplo Alternado", detected: doubleAlternate, strength: doubleAlternate ? 65 : 12 },
    ],
  };
}

// ---------- INSIGHT HELPERS ----------

function createDoubleInsight(metrics: ReturnType<typeof analyzeDouble>) {
  const direction =
    metrics.dominantColor === "red"
      ? "vermelho"
      : metrics.dominantColor === "black"
      ? "preto"
      : "branco";
  const alternationText =
    metrics.alternationRatio > 0.55
      ? "mercado alternando forte"
      : "mercado com blocos de repeticao";
  return `Double: ${direction} lidera com ${metrics.dominance.toFixed(1)}% nas ultimas rodadas. ${alternationText}. Score estatistico de oportunidade ${metrics.opportunityScore}/100. Use gerenciamento de banca, sem garantia de acerto.`;
}

function createCrashInsight(metrics: ReturnType<typeof analyzeCrash>) {
  const trend =
    metrics.maShort > metrics.maLong
      ? "aceleracao positiva"
      : "pressao de baixa";
  return `Crash: media curta ${metrics.maShort.toFixed(2)}x contra media longa ${metrics.maLong.toFixed(2)}x. O fluxo atual mostra ${trend}, volatilidade ${metrics.volatility.toFixed(2)} e confianca ${metrics.confidence}/100. Analise historica, nao e previsao garantida.`;
}

// ---------- FETCH HELPERS ----------

async function fetchBlazeDouble(): Promise<DoubleRound[] | null> {
  const apiBase =
    (globalThis as { __DATA_API_BASE__?: string }).__DATA_API_BASE__ ?? "";
  const sources = [
    `${apiBase}/api/v1/blaze/roulette/recent`,
    "https://blaze.com/api/roulette_games/recent",
  ].filter(
    (url) =>
      url && !url.startsWith("/api") && !url.startsWith("undefined")
  );

  for (const source of sources) {
    try {
      const res = await fetch(source);
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{
        id: number;
        color: number;
        created_at?: string;
      }>;
      if (!Array.isArray(data) || !data.length) continue;
      return data
        .map(
          (item): DoubleRound => ({
            id: Number(item.id),
            color:
              item.color === 1 ? "red" : item.color === 2 ? "black" : "white",
            createdAt: item.created_at ?? new Date().toISOString(),
          })
        )
        .reverse();
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchBlazeCrash(): Promise<CrashRound[] | null> {
  const apiBase =
    (globalThis as { __DATA_API_BASE__?: string }).__DATA_API_BASE__ ?? "";
  const sources = [
    `${apiBase}/api/v1/blaze/crash/recent`,
    "https://blaze.com/api/crash_games/recent",
  ].filter(
    (url) =>
      url && !url.startsWith("/api") && !url.startsWith("undefined")
  );

  for (const source of sources) {
    try {
      const res = await fetch(source);
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{
        id: number;
        crash_point?: string | number;
        created_at?: string;
      }>;
      if (!Array.isArray(data) || !data.length) continue;
      return data
        .map((item) => ({
          id: Number(item.id),
          multiplier: Number(item.crash_point ?? 1),
          createdAt: item.created_at ?? new Date().toISOString(),
        }))
        .reverse();
    } catch {
      continue;
    }
  }
  return null;
}

// ---------- SIMULATOR ----------

function runSimulator(
  strategy: string,
  initialBankroll: number,
  rounds: DoubleRound[]
): SimulatorResult {
  let bankroll = initialBankroll;
  let peak = bankroll;
  let maxDrawdown = 0;
  let stake = initialBankroll * 0.01;
  let wins = 0;
  const curve = [bankroll];

  for (let i = 8; i < rounds.length; i += 1) {
    const sample = rounds.slice(i - 8, i);
    const metrics = analyzeDouble(sample);
    const expected =
      strategy === "Tendencia"
        ? metrics.dominantColor
        : strategy === "Contratendencia"
        ? metrics.dominantColor === "red"
          ? "black"
          : "red"
        : strategy === "Flat"
        ? "red"
        : sample[sample.length - 1].color === "red"
        ? "red"
        : "black";

    const actual = rounds[i].color;
    const isWin = actual === expected;
    if (isWin) {
      bankroll += stake;
      wins += 1;
      if (strategy === "Martingale")
        stake = Math.max(initialBankroll * 0.01, stake * 0.5);
    } else {
      bankroll -= stake;
      if (strategy === "Martingale")
        stake = Math.min(initialBankroll * 0.15, stake * 2);
    }
    peak = Math.max(peak, bankroll);
    maxDrawdown = Math.max(maxDrawdown, peak - bankroll);
    curve.push(Number(bankroll.toFixed(2)));
  }

  const pnl = bankroll - initialBankroll;
  return {
    strategy,
    finalBankroll: Number(bankroll.toFixed(2)),
    hitRate: Number(
      ((wins / Math.max(1, rounds.length - 8)) * 100).toFixed(1)
    ),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    pnl: Number(pnl.toFixed(2)),
    curve,
  };
}

// ---------- SPARKLINE ----------

function Sparkline({
  values,
  positive = true,
}: {
  values: number[];
  positive?: boolean;
}) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = Math.max(1, max - min);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 100;
      const y = 100 - ((v - min) / spread) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-20 w-full">
      <motion.polyline
        fill="none"
        stroke={positive ? "#22d3ee" : "#f43f5e"}
        strokeWidth="3"
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </svg>
  );
}

// ---------- COLOR DOT ----------

function ColorDot({ color, size = "md" }: { color: Color; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };
  const bg =
    color === "red"
      ? "bg-red-500"
      : color === "black"
      ? "bg-neutral-700 border border-slate-600"
      : "bg-white";
  return <div className={`${sizes[size]} rounded-full ${bg} shrink-0`} />;
}

// ---------- PROBABILITY BAR ----------

function ProbBar({
  label,
  value,
  color,
  max = 100,
}: {
  label: string;
  value: number;
  color: string;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ---------- STRENGTH BADGE ----------

function StrengthBadge({ strength }: { strength: "forte" | "medio" | "fraco" }) {
  const map = {
    forte: { label: "FORTE", cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
    medio: { label: "MÉDIO", cls: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
    fraco: { label: "FRACO", cls: "bg-slate-700 text-slate-400 border border-slate-600" },
  };
  const { label, cls } = map[strength];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

// ========== MAIN APP ==========

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [plan, setPlan] = useState<Plan>("free");
  const [isLogged, setIsLogged] = useState(false);
  const [email, setEmail] = useState("");
  const [doubleRounds, setDoubleRounds] = useState<DoubleRound[]>(() =>
    makeDoubleRounds(140)
  );
  const [crashRounds, setCrashRounds] = useState<CrashRound[]>(() =>
    makeCrashRounds(140)
  );
  const [source, setSource] = useState<"blaze" | "socket" | "simulado">("simulado");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const seenSocketDoubleRef = useRef<Set<number>>(new Set());
  const seenSocketCrashRef = useRef<Set<number>>(new Set());

  const blazeSocket = useBlazeSocket();
  const [strategyBankroll, setStrategyBankroll] = useState(1000);
  const [channels, setChannels] = useState({
    email: true,
    push: true,
    sound: false,
  });

  const doubleMetrics = useMemo(
    () => analyzeDouble(doubleRounds),
    [doubleRounds]
  );
  const crashMetrics = useMemo(
    () => analyzeCrash(crashRounds),
    [crashRounds]
  );
  const strategyData = useMemo(
    () => analyzeStrategies(doubleRounds),
    [doubleRounds]
  );

  const simulator = useMemo(() => {
    const strategies = ["Tendencia", "Contratendencia", "Flat", "Martingale"];
    return strategies.map((s) =>
      runSimulator(s, strategyBankroll, doubleRounds.slice(-120))
    );
  }, [doubleRounds, strategyBankroll]);

  const hasAccess = (section: Section) => {
    const module = section === "settings" ? "dashboard" : section;
    return PLAN_FEATURES[plan].includes(module);
  };

  useEffect(() => {
    let isMounted = true;
    async function bootstrap() {
      const [doubleData, crashData] = await Promise.all([
        fetchBlazeDouble(),
        fetchBlazeCrash(),
      ]);
      if (!isMounted) return;
      if (doubleData?.length) setDoubleRounds(doubleData.slice(-180));
      if (crashData?.length) setCrashRounds(crashData.slice(-180));
      if (doubleData?.length && crashData?.length) setSource("blaze");
    }
    bootstrap();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (blazeSocket.status !== "connected") return;
    const { lastDoubleRound, lastCrashRound } = blazeSocket;
    if (lastDoubleRound && !seenSocketDoubleRef.current.has(lastDoubleRound.id)) {
      seenSocketDoubleRef.current.add(lastDoubleRound.id);
      setDoubleRounds((prev) => {
        const exists = prev.some((r) => r.id === lastDoubleRound.id);
        if (exists) return prev;
        return [...prev, lastDoubleRound].slice(-220);
      });
      setSource("socket");
    }
    if (lastCrashRound && !seenSocketCrashRef.current.has(lastCrashRound.id)) {
      seenSocketCrashRef.current.add(lastCrashRound.id);
      setCrashRounds((prev) => {
        const exists = prev.some((r) => r.id === lastCrashRound.id);
        if (exists) return prev;
        return [...prev, lastCrashRound].slice(-220);
      });
    }
  }, [blazeSocket.status, blazeSocket.lastDoubleRound, blazeSocket.lastCrashRound]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (source === "blaze" || source === "socket") return;
      setDoubleRounds((prev) => {
        const next = [
          ...prev,
          {
            id: prev.length + 1,
            color: randomColor(),
            createdAt: new Date().toISOString(),
          },
        ];
        return next.slice(-220);
      });
      setCrashRounds((prev) => {
        const next = [
          ...prev,
          {
            id: prev.length + 1,
            multiplier: Number(
              (1 + Math.random() * Math.random() * 18).toFixed(2)
            ),
            createdAt: new Date().toISOString(),
          },
        ];
        return next.slice(-220);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [source]);

  useEffect(() => {
    const poll = setInterval(async () => {
      if (blazeSocket.status === "connected") return;
      const [doubleData, crashData] = await Promise.all([
        fetchBlazeDouble(),
        fetchBlazeCrash(),
      ]);
      if (doubleData?.length && crashData?.length) {
        setSource("blaze");
        setDoubleRounds(doubleData.slice(-220));
        setCrashRounds(crashData.slice(-220));
      }
    }, 15000);
    return () => clearInterval(poll);
  }, [blazeSocket.status]);

  useEffect(() => {
    const nextAlerts: AlertItem[] = [];
    if (doubleMetrics.longestStreak >= 6) {
      nextAlerts.push({
        id: Date.now(),
        priority: "high",
        title: "Sequencia longa em Double",
        text: `Foram detectadas ${doubleMetrics.longestStreak} rodadas seguidas. Revise exposicao e risco.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
    if (doubleMetrics.opportunityScore >= 75) {
      nextAlerts.push({
        id: Date.now() + 1,
        priority: "medium",
        title: "Score de oportunidade elevado",
        text: `Double com score ${doubleMetrics.opportunityScore}/100 baseado em distribuicao e ritmo.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
    if (crashMetrics.confidence >= 70) {
      nextAlerts.push({
        id: Date.now() + 2,
        priority: "low",
        title: "Crash em fase estatistica favoravel",
        text: `Confianca ${crashMetrics.confidence}/100 com MA curta acima da longa.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
    if (nextAlerts.length) {
      setAlerts((prev) => [...nextAlerts, ...prev].slice(0, 30));
    }
  }, [
    doubleMetrics.longestStreak,
    doubleMetrics.opportunityScore,
    crashMetrics.confidence,
  ]);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-2">
              StatEdge Pro
            </p>
            <h1 className="text-3xl font-bold text-white">Bem-vindo</h1>
            <p className="mt-2 text-sm text-slate-400">
              Analytics em tempo real para Double e Crash
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Plano</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as Plan)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsLogged(true)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 transition-colors text-slate-900 font-bold rounded-lg py-2.5 text-sm"
            >
              Entrar no Dashboard
            </motion.button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-600">
            Leitura estatistica. Nenhuma garantia de resultado.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-5 flex flex-col">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
              StatEdge Pro
            </p>
            <h1 className="mt-1 text-xl font-semibold">Trading Analytics</h1>
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  source === "socket"
                    ? "bg-emerald-400 animate-pulse"
                    : source === "blaze"
                    ? "bg-emerald-400 animate-pulse"
                    : blazeSocket.status === "connecting"
                    ? "bg-cyan-400 animate-pulse"
                    : blazeSocket.status === "blocked"
                    ? "bg-rose-500"
                    : "bg-amber-400"
                }`}
              />
              <p className="text-xs text-slate-400">
                {source === "socket"
                  ? "Blaze WebSocket"
                  : source === "blaze"
                  ? "Blaze ao vivo"
                  : blazeSocket.status === "connecting"
                  ? "Conectando..."
                  : blazeSocket.status === "blocked"
                  ? "Simulado (IP bloqueado)"
                  : "Simulado"}
              </p>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {SECTIONS.map((s) => {
              const locked = !hasAccess(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => !locked && setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    activeSection === s.id
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : locked
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {locked && (
                    <span className="text-[10px] bg-slate-800 border border-slate-700 px-1 rounded text-slate-500 ml-auto">
                      PRO
                    </span>
                  )}
                  {s.label}
                  {s.id === "estrategias" && (
                    <span className="ml-auto text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 rounded-full">
                      NOVO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">
                {email.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-200 truncate">
                  {email || "usuario@demo.com"}
                </p>
                <p className="text-[10px] text-cyan-400 uppercase tracking-wider">
                  {plan}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLogged(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sair
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === "dashboard" && (
                <DashboardSection
                  doubleMetrics={doubleMetrics}
                  crashMetrics={crashMetrics}
                  doubleRounds={doubleRounds}
                  crashRounds={crashRounds}
                  strategyData={strategyData}
                />
              )}
              {activeSection === "double" && (
                <DoubleSection
                  rounds={doubleRounds}
                  metrics={doubleMetrics}
                  insight={createDoubleInsight(doubleMetrics)}
                />
              )}
              {activeSection === "crash" && (
                <CrashSection
                  rounds={crashRounds}
                  metrics={crashMetrics}
                  insight={createCrashInsight(crashMetrics)}
                />
              )}
              {activeSection === "estrategias" && (
                <EstrategiasSection
                  rounds={doubleRounds}
                  data={strategyData}
                />
              )}
              {activeSection === "ia" && (
                <IASection
                  doubleMetrics={doubleMetrics}
                  crashMetrics={crashMetrics}
                  insight={createDoubleInsight(doubleMetrics)}
                  crashInsight={createCrashInsight(crashMetrics)}
                />
              )}
              {activeSection === "simulator" && (
                <SimulatorSection
                  results={simulator}
                  bankroll={strategyBankroll}
                  onBankrollChange={setStrategyBankroll}
                />
              )}
              {activeSection === "alerts" && (
                <AlertsSection
                  alerts={alerts}
                  onMarkRead={(id) =>
                    setAlerts((prev) =>
                      prev.map((a) =>
                        a.id === id ? { ...a, read: true } : a
                      )
                    )
                  }
                />
              )}
              {activeSection === "settings" && (
                <SettingsSection
                  plan={plan}
                  channels={channels}
                  onChannelToggle={(ch) =>
                    setChannels((prev) => ({
                      ...prev,
                      [ch]: !prev[ch as keyof typeof prev],
                    }))
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ============ SECTIONS ============

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-900/70 border border-slate-800 rounded-2xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// ---- DASHBOARD ----

function DashboardSection({
  doubleMetrics,
  crashMetrics,
  doubleRounds,
  crashRounds,
  strategyData,
}: {
  doubleMetrics: ReturnType<typeof analyzeDouble>;
  crashMetrics: ReturnType<typeof analyzeCrash>;
  doubleRounds: DoubleRound[];
  crashRounds: CrashRound[];
  strategyData: ReturnType<typeof analyzeStrategies>;
}) {
  const last5 = doubleRounds.slice(-5).reverse();
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        subtitle="Visão consolidada do mercado em tempo real"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Score Double
          </p>
          <p className="text-4xl font-bold text-cyan-400">
            {doubleMetrics.opportunityScore}
            <span className="text-base text-slate-400">/100</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Oportunidade estatística</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Confiança Crash
          </p>
          <p className="text-4xl font-bold text-violet-400">
            {crashMetrics.confidence}
            <span className="text-base text-slate-400">/100</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            MA curta vs longa
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Previsão
          </p>
          <div className="flex items-center gap-2 mt-1">
            <ColorDot color={strategyData.nextPrediction} size="lg" />
            <div>
              <p className="text-xl font-bold text-white capitalize">
                {strategyData.nextPrediction === "red"
                  ? "Vermelho"
                  : strategyData.nextPrediction === "black"
                  ? "Preto"
                  : "Branco"}
              </p>
              <p className="text-xs text-slate-400">
                {strategyData.nextConfidence}% confiança
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
            Últimas 5 rodadas
          </p>
          <div className="flex items-center gap-2">
            {last5.map((r, i) => (
              <ColorDot key={i} color={r.color} size="md" />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Sequência atual:{" "}
            <span className="text-slate-300 font-medium">
              {strategyData.currentStreak.length}x{" "}
              {strategyData.currentStreak.color === "red"
                ? "Vermelho"
                : strategyData.currentStreak.color === "black"
                ? "Preto"
                : "Branco"}
            </span>
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
            Distribuição (últ. 20)
          </p>
          <div className="space-y-2">
            <ProbBar
              label="Vermelho"
              value={strategyData.redProb}
              color="#ef4444"
            />
            <ProbBar
              label="Preto"
              value={strategyData.blackProb}
              color="#94a3b8"
            />
            <ProbBar
              label="Branco"
              value={strategyData.whiteProb}
              color="#f8fafc"
            />
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Crash MA
        </p>
        <Sparkline
          values={crashRounds.slice(-40).map((r) => r.multiplier)}
          positive={crashMetrics.momentum >= 0}
        />
      </Card>
    </div>
  );
}

// ---- DOUBLE ----

function DoubleSection({
  rounds,
  metrics,
  insight,
}: {
  rounds: DoubleRound[];
  metrics: ReturnType<typeof analyzeDouble>;
  insight: string;
}) {
  const recent = rounds.slice(-30).reverse();
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Double"
        subtitle="Análise de rodadas de Double em tempo real"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Score
          </p>
          <p className="text-4xl font-bold text-cyan-400">
            {metrics.opportunityScore}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Maior Sequência
          </p>
          <p className="text-4xl font-bold text-amber-400">
            {metrics.longestStreak}x
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Cor Dominante
          </p>
          <div className="flex items-center gap-2 mt-1">
            <ColorDot color={metrics.dominantColor} size="md" />
            <p className="text-lg font-bold">
              {metrics.dominance.toFixed(1)}%
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Distribuição (últimas 60)
        </p>
        <div className="space-y-3">
          <ProbBar
            label={`Vermelho (${metrics.counts.red})`}
            value={Math.round((metrics.counts.red / 60) * 100)}
            color="#ef4444"
          />
          <ProbBar
            label={`Preto (${metrics.counts.black})`}
            value={Math.round((metrics.counts.black / 60) * 100)}
            color="#94a3b8"
          />
          <ProbBar
            label={`Branco (${metrics.counts.white})`}
            value={Math.round((metrics.counts.white / 60) * 100)}
            color="#f8fafc"
          />
        </div>
      </Card>

      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Histórico de rodadas
        </p>
        <div className="flex flex-wrap gap-2">
          {recent.map((r, i) => (
            <ColorDot key={i} color={r.color} size="sm" />
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2">
          Insight
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
        <p className="text-xs text-slate-600 mt-3">
          ⚠ Leitura estatística. Não é previsão garantida.
        </p>
      </Card>
    </div>
  );
}

// ---- CRASH ----

function CrashSection({
  rounds,
  metrics,
  insight,
}: {
  rounds: CrashRound[];
  metrics: ReturnType<typeof analyzeCrash>;
  insight: string;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Crash"
        subtitle="Análise de multiplicadores e volatilidade"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "MA Curta",
            value: `${metrics.maShort.toFixed(2)}x`,
            color: "text-cyan-400",
          },
          {
            label: "MA Longa",
            value: `${metrics.maLong.toFixed(2)}x`,
            color: "text-violet-400",
          },
          {
            label: "Volatilidade",
            value: metrics.volatility.toFixed(2),
            color: "text-amber-400",
          },
          {
            label: "Confiança",
            value: `${metrics.confidence}/100`,
            color: "text-emerald-400",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Curva de multiplicadores
        </p>
        <Sparkline
          values={rounds.slice(-50).map((r) => r.multiplier)}
          positive={metrics.momentum >= 0}
        />
      </Card>

      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Últimas rodadas
        </p>
        <div className="grid grid-cols-5 gap-2">
          {rounds
            .slice(-20)
            .reverse()
            .map((r, i) => (
              <div
                key={i}
                className={`text-center py-2 rounded-lg text-xs font-mono font-semibold ${
                  r.multiplier >= 10
                    ? "bg-emerald-500/20 text-emerald-400"
                    : r.multiplier >= 3
                    ? "bg-cyan-500/10 text-cyan-400"
                    : r.multiplier < 2
                    ? "bg-red-500/10 text-red-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {r.multiplier.toFixed(2)}x
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2">
          Insight
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
        <p className="text-xs text-slate-600 mt-3">
          ⚠ Leitura estatística. Não é previsão garantida.
        </p>
      </Card>
    </div>
  );
}

// ---- ESTRATÉGIAS ----

function EstrategiasSection({
  rounds,
  data,
}: {
  rounds: DoubleRound[];
  data: ReturnType<typeof analyzeStrategies>;
}) {
  const [selected, setSelected] = useState<"all" | Color>("all");

  const filteredSignals =
    selected === "all"
      ? data.signals
      : data.signals.filter((s) => s.color === selected);

  const colorLabel = (c: Color) =>
    c === "red" ? "Vermelho" : c === "black" ? "Preto" : "Branco";
  const colorHex = (c: Color) =>
    c === "red" ? "#ef4444" : c === "black" ? "#94a3b8" : "#f8fafc";

  const last10 = rounds.slice(-10).reverse();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Estratégias de Cores"
        subtitle="Padrões estatísticos e probabilidades de entrada para Vermelho, Preto e Branco"
      />

      {/* Probability cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["red", "black", "white"] as Color[]).map((c) => {
          const prob =
            c === "red"
              ? data.redProb
              : c === "black"
              ? data.blackProb
              : data.whiteProb;
          const hex = colorHex(c);
          const isHigh = prob >= 50;
          return (
            <motion.div
              key={c}
              whileHover={{ scale: 1.02 }}
              className={`bg-slate-900/70 border rounded-2xl p-5 cursor-pointer transition-colors ${
                selected === c
                  ? "border-cyan-500/50"
                  : "border-slate-800 hover:border-slate-700"
              }`}
              onClick={() => setSelected(selected === c ? "all" : c)}
            >
              <div className="flex items-center gap-3 mb-3">
                <ColorDot color={c} size="md" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {colorLabel(c)}
                  </p>
                  <p className="text-xs text-slate-500">últimas 20</p>
                </div>
              </div>
              <p
                className="text-4xl font-bold font-mono"
                style={{ color: hex }}
              >
                {prob}%
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: hex }}
                  initial={{ width: 0 }}
                  animate={{ width: `${prob}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p
                className={`mt-2 text-xs font-medium ${
                  isHigh ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {isHigh ? "Acima da média" : "Abaixo da média"}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Current streak + next prediction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
            Sequência atual
          </p>
          <div className="flex items-center gap-3">
            <ColorDot color={data.currentStreak.color} size="lg" />
            <div>
              <p className="text-3xl font-bold text-white">
                {data.currentStreak.length}
                <span className="text-base text-slate-400 ml-1">seguidas</span>
              </p>
              <p className="text-sm text-slate-400">
                {colorLabel(data.currentStreak.color)} em sequência
              </p>
            </div>
          </div>
          {data.currentStreak.length >= 3 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium">
                Atenção: sequência longa detectada. Probabilidade de reversão
                aumenta.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
            Previsão estatística próxima rodada
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <ColorDot color={data.nextPrediction} size="lg" />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: `0 0 16px ${colorHex(data.nextPrediction)}80`,
                }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {colorLabel(data.nextPrediction)}
              </p>
              <p className="text-sm" style={{ color: colorHex(data.nextPrediction) }}>
                {data.nextConfidence}% de confiança
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: colorHex(data.nextPrediction) }}
              initial={{ width: 0 }}
              animate={{ width: `${data.nextConfidence}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Baseado em padrões detectados. Sem garantia.
          </p>
        </Card>
      </div>

      {/* Pattern detection */}
      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">
          Padrões detectados
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.patterns.map((p) => (
            <div
              key={p.name}
              className={`p-3 rounded-xl border ${
                p.detected
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-slate-800/40 border-slate-700/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    p.detected ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                <p
                  className={`text-xs font-semibold ${
                    p.detected ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {p.detected ? "ATIVO" : "INATIVO"}
                </p>
              </div>
              <p className="text-sm text-white font-medium">{p.name}</p>
              <div className="mt-2 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    p.detected ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                  style={{ width: `${p.strength}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{p.strength}% força</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Signals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-sm font-semibold text-white">
            Sinais de Entrada
          </p>
          <div className="flex gap-2">
            {(["all", "red", "black", "white"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSelected(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selected === f
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                    : "border-slate-700 text-slate-500 hover:text-slate-300"
                }`}
              >
                {f === "all"
                  ? "Todos"
                  : f === "red"
                  ? "Vermelho"
                  : f === "black"
                  ? "Preto"
                  : "Branco"}
              </button>
            ))}
          </div>
        </div>

        {filteredSignals.length === 0 && (
          <Card>
            <p className="text-center text-slate-500 text-sm py-4">
              Nenhum sinal detectado para este filtro agora.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {filteredSignals.map((signal, i) => (
              <motion.div
                key={`${signal.pattern}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-slate-900/70 border rounded-2xl p-5 ${
                  signal.strength === "forte"
                    ? "border-emerald-500/30"
                    : signal.strength === "medio"
                    ? "border-amber-500/20"
                    : "border-slate-800"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <ColorDot color={signal.color} size="md" />
                    {signal.strength === "forte" && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          boxShadow: `0 0 12px ${colorHex(signal.color)}60`,
                        }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: colorHex(signal.color) }}
                      >
                        {colorLabel(signal.color)}
                      </span>
                      <StrengthBadge strength={signal.strength} />
                      <span className="text-xs text-slate-500">
                        {signal.pattern}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{signal.description}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: colorHex(signal.color) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${signal.probability}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      <span
                        className="text-xs font-mono font-bold shrink-0"
                        style={{ color: colorHex(signal.color) }}
                      >
                        {signal.probability}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent history grid */}
      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Últimas 20 rodadas
        </p>
        <div className="flex flex-wrap gap-2">
          {last10.map((r, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <ColorDot color={r.color} size="sm" />
              <span className="text-[9px] text-slate-600 font-mono">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <p className="text-xs text-slate-500 leading-relaxed">
          ⚠ Aviso de risco: Os sinais e probabilidades apresentados são leituras
          estatísticas baseadas em histórico. Não representam previsão garantida
          ou promessa de lucro. Sempre utilize gerenciamento de banca responsável.
        </p>
      </div>
    </div>
  );
}

// ---- IA ADVISOR ----

function IASection({
  doubleMetrics,
  crashMetrics,
  insight,
  crashInsight,
}: {
  doubleMetrics: ReturnType<typeof analyzeDouble>;
  crashMetrics: ReturnType<typeof analyzeCrash>;
  insight: string;
  crashInsight: string;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="IA Advisor"
        subtitle="Análise automatizada baseada em estatísticas"
      />
      <Card>
        <p className="text-xs text-cyan-400 uppercase tracking-wider mb-3">
          Double — Análise
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
      </Card>
      <Card>
        <p className="text-xs text-violet-400 uppercase tracking-wider mb-3">
          Crash — Análise
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{crashInsight}</p>
      </Card>
      <Card>
        <p className="text-xs text-amber-400 uppercase tracking-wider mb-3">
          Recomendações
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          {doubleMetrics.longestStreak >= 5 && (
            <li className="flex gap-2">
              <span className="text-amber-400">›</span>
              Sequência longa detectada — considere aguardar reversão antes de entrar.
            </li>
          )}
          {crashMetrics.volatility > 2 && (
            <li className="flex gap-2">
              <span className="text-amber-400">›</span>
              Volatilidade alta no Crash — prefira saídas conservadoras (abaixo de 2x).
            </li>
          )}
          {doubleMetrics.counts.white <= 2 && (
            <li className="flex gap-2">
              <span className="text-amber-400">›</span>
              Branco abaixo da frequência histórica — possível acumulação de pressão.
            </li>
          )}
          <li className="flex gap-2">
            <span className="text-emerald-400">›</span>
            Gerencie sua banca. Nunca arrisque mais do que pode perder.
          </li>
        </ul>
      </Card>
    </div>
  );
}

// ---- SIMULATOR ----

function SimulatorSection({
  results,
  bankroll,
  onBankrollChange,
}: {
  results: SimulatorResult[];
  bankroll: number;
  onBankrollChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Simulador"
        subtitle="Backtesting de estratégias com dados históricos"
      />
      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Banca inicial
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={bankroll}
            onChange={(e) => onBankrollChange(Number(e.target.value))}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-cyan-400 font-mono font-semibold w-20 text-right">
            R$ {bankroll}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((r) => (
          <Card key={r.strategy}>
            <div className="flex items-start justify-between mb-3">
              <p className="font-semibold text-white">{r.strategy}</p>
              <span
                className={`text-sm font-mono font-bold ${
                  r.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {r.pnl >= 0 ? "+" : ""}R$ {r.pnl.toFixed(2)}
              </span>
            </div>
            <Sparkline values={r.curve} positive={r.pnl >= 0} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Acerto</p>
                <p className="text-white font-semibold">{r.hitRate}%</p>
              </div>
              <div>
                <p className="text-slate-500">Drawdown</p>
                <p className="text-red-400 font-semibold">
                  R$ {r.maxDrawdown.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Banca final</p>
                <p className="text-cyan-400 font-semibold">
                  R$ {r.finalBankroll}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- ALERTS ----

function AlertsSection({
  alerts,
  onMarkRead,
}: {
  alerts: AlertItem[];
  onMarkRead: (id: number) => void;
}) {
  const priorityColor = {
    high: "text-red-400 border-red-500/30",
    medium: "text-amber-400 border-amber-500/30",
    low: "text-cyan-400 border-cyan-500/20",
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alertas"
        subtitle={`${alerts.filter((a) => !a.read).length} não lidos`}
      />
      {alerts.length === 0 && (
        <Card>
          <p className="text-center text-slate-500 py-8">
            Nenhum alerta no momento.
          </p>
        </Card>
      )}
      <div className="space-y-3">
        {alerts.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-slate-900/70 border rounded-xl p-4 flex gap-4 items-start ${
              priorityColor[a.priority]
            } ${a.read ? "opacity-50" : ""}`}
          >
            <div
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                a.priority === "high"
                  ? "bg-red-400"
                  : a.priority === "medium"
                  ? "bg-amber-400"
                  : "bg-cyan-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{a.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{a.text}</p>
            </div>
            {!a.read && (
              <button
                onClick={() => onMarkRead(a.id)}
                className="text-xs text-slate-500 hover:text-slate-300 shrink-0"
              >
                Lido
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---- SETTINGS ----

function SettingsSection({
  plan,
  channels,
  onChannelToggle,
}: {
  plan: Plan;
  channels: { email: boolean; push: boolean; sound: boolean };
  onChannelToggle: (ch: string) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Configurações" />
      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Plano atual
        </p>
        <p className="text-2xl font-bold text-cyan-400 capitalize">{plan}</p>
      </Card>
      <Card>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">
          Canais de notificação
        </p>
        <div className="space-y-3">
          {Object.entries(channels).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-300 capitalize">{key}</span>
              <button
                onClick={() => onChannelToggle(key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  val ? "bg-cyan-500" : "bg-slate-700"
                }`}
              >
                <motion.div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                  animate={{ left: val ? "22px" : "2px" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
