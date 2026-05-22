import { motion } from "framer-motion";
import type { ScoreResult } from "../../utils/types";

type Props = {
  score: ScoreResult;
  frequency: { red_pct: number; black_pct: number; white_pct: number };
};

type BarProps = {
  label: string;
  emoji: string;
  freq: number;
  score: number;
  color: string;
  bg: string;
};

function Bar({ label, emoji, freq, score, color, bg }: BarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-300 font-medium">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ background: bg }}
          />
          {emoji} {label}
        </span>
        <div className="flex gap-3 text-xs">
          <span className="text-slate-500">
            freq <span className="text-slate-300 font-mono">{freq}%</span>
          </span>
          <span className="text-slate-500">
            score{" "}
            <span className="font-mono font-bold" style={{ color }}>
              {Math.round(score * 100)}%
            </span>
          </span>
        </div>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: bg }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(score * 100)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/20"
          style={{ left: `${freq}%` }}
          title="Frequência real"
        />
      </div>
    </div>
  );
}

export function ProbabilityCard({ score, frequency }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
          Score de Probabilidade
        </h2>
        <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-2 py-0.5">
          Ajustado por desvio
        </span>
      </div>

      <Bar
        label="Vermelho"
        emoji="🔴"
        freq={frequency.red_pct}
        score={score.red}
        color="#ef4444"
        bg="#ef4444"
      />
      <Bar
        label="Preto"
        emoji="⚫"
        freq={frequency.black_pct}
        score={score.black}
        color="#94a3b8"
        bg="#475569"
      />
      <Bar
        label="Branco"
        emoji="⚪"
        freq={frequency.white_pct}
        score={score.white}
        color="#f1f5f9"
        bg="#f1f5f9"
      />

      <p className="text-[10px] text-slate-600 pt-1">
        Barra: score ajustado. Traço vertical: frequência real. Apenas análise
        estatística.
      </p>
    </div>
  );
}
