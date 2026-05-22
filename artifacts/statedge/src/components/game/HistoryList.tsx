import type { HistoryItem } from "../../utils/types";

type Props = { history: HistoryItem[]; limit?: number };

function ColorBall({ color }: { color: string | null }) {
  const style =
    color === "red"
      ? "bg-red-500"
      : color === "black"
      ? "bg-slate-600 border border-slate-500"
      : "bg-white";

  return (
    <div
      className={`w-7 h-7 rounded-full shrink-0 ${style} flex items-center justify-center text-[9px] font-bold`}
    >
      {color === "white" ? (
        <span className="text-slate-400">B</span>
      ) : null}
    </div>
  );
}

export function HistoryList({ history, limit = 20 }: Props) {
  const items = history.filter((h) => h.game_type === "double").slice(-limit).reverse();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
          Histórico Recente
        </h2>
        <span className="text-xs text-slate-500">Últimas {limit} jogadas</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <div key={item.id} className="relative group">
            <ColorBall color={item.color} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-slate-700 text-white text-[9px] rounded px-1.5 py-0.5 whitespace-nowrap">
                #{items.length - i}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-600 text-sm py-2">Sem histórico disponível</p>
        )}
      </div>

      <div className="flex gap-4 text-[10px] text-slate-600 pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Vermelho
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-600 border border-slate-500 inline-block" /> Preto
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white inline-block" /> Branco
        </span>
      </div>
    </div>
  );
}
