type Props = {
  source: string;
  lastUpdate: Date | null;
  total: number;
};

export function StatusBar({ source, lastUpdate, total }: Props) {
  const isLive = source === "supabase" || source === "socket";

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
          }`}
        />
        <span className="text-slate-400">
          {source === "supabase"
            ? "Dados do Supabase"
            : source === "socket"
            ? "WebSocket ao vivo"
            : "Dados simulados"}
        </span>
      </div>
      <div className="flex items-center gap-4 text-slate-500">
        <span>{total} rodadas</span>
        {lastUpdate && (
          <span>
            Atualizado às <span className="text-slate-400 font-mono">{timeStr}</span>
          </span>
        )}
      </div>
    </div>
  );
}
