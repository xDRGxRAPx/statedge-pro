import { deviationColor, deviationLabel } from "../../utils/deviation";
import type { DeviationResult } from "../../utils/types";

type Props = { deviation: DeviationResult };

function Row({
  label,
  dev,
  emoji,
}: {
  label: string;
  dev: number;
  emoji: string;
}) {
  const pct = parseFloat((dev * 100).toFixed(1));
  const color = deviationColor(dev);
  const status = deviationLabel(dev);

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-sm text-slate-400 flex items-center gap-2">
        {emoji} {label}
      </span>
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
          style={{
            color,
            background: color + "18",
            border: `1px solid ${color}30`,
          }}
        >
          {status}
        </span>
        <span
          className="text-sm font-mono font-bold w-16 text-right"
          style={{ color }}
        >
          {pct > 0 ? "+" : ""}
          {pct}%
        </span>
      </div>
    </div>
  );
}

export function DeviationCard({ deviation }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
          Desvio da Média
        </h2>
        <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-2 py-0.5">
          Base: 47.5 / 47.5 / 5%
        </span>
      </div>

      <Row label="Vermelho" emoji="🔴" dev={deviation.desvio_red} />
      <Row label="Preto" emoji="⚫" dev={deviation.desvio_black} />
      <Row label="Branco" emoji="⚪" dev={deviation.desvio_white} />
    </div>
  );
}
