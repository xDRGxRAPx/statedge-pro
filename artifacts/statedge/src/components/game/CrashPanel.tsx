import { motion } from "framer-motion";
import type { CrashAnalysis, HistoryItem } from "../../utils/types";

type Props = {
  analysis: CrashAnalysis;
  history: HistoryItem[];
};

type SegProps = {
  label: string;
  pct: number;
  color: string;
  range: string;
};

function Segment({ label, pct, color, range }: SegProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color }} className="font-medium">
          {label}
          <span className="text-slate-600 ml-1 font-normal">{range}</span>
        </span>
        <span className="font-mono font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function CrashPanel({ analysis, history }: Props) {
  const recent = history
    .filter((h) => h.game_type === "crash" && h.multiplier !== null)
    .slice(-10)
    .reverse();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
        Crash Analytics
      </h2>

      <div className="space-y-3">
        <Segment label="Baixa" pct={analysis.baixa_pct} color="#64748b" range="1.0–1.5x" />
        <Segment label="Média" pct={analysis.media_pct} color="#22d3ee" range="1.5–3x" />
        <Segment label="Alta" pct={analysis.alta_pct} color="#f59e0b" range="3–10x" />
        <Segment label="Explosiva" pct={analysis.explosiva_pct} color="#ef4444" range="10x+" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Stat label="Média geral" value={`${analysis.media_multipicador}x`} />
        <Stat label="Seq. baixas atual" value={analysis.sequencia_baixa} alert={analysis.sequencia_baixa >= 5} />
        <Stat label="Sem explosão" value={`${analysis.ausencia_explosao} jogadas`} alert={analysis.ausencia_explosao >= 30} />
        <Stat label="Intervalo p/ pico" value={analysis.intervalo_medio_pico > 0 ? `~${analysis.intervalo_medio_pico}` : "—"} />
      </div>

      {recent.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 mb-2">Últimos 10 multiplicadores</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((item) => {
              const m = item.multiplier!;
              const color =
                m >= 10 ? "#ef4444" : m >= 3 ? "#f59e0b" : m >= 1.5 ? "#22d3ee" : "#64748b";
              return (
                <span
                  key={item.id}
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{ color, background: color + "18", border: `1px solid ${color}30` }}
                >
                  {m.toFixed(2)}x
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-3">
      <p className="text-[10px] text-slate-500 mb-1">{label}</p>
      <p
        className="text-sm font-mono font-bold"
        style={{ color: alert ? "#ef4444" : "#f1f5f9" }}
      >
        {value}
      </p>
    </div>
  );
}
