import { intensityColor, intensityLabel } from "../../utils/events";
import type { GameEvent } from "../../utils/types";

type Props = { events: GameEvent[] };

export function EventsPanel({ events }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
          Eventos Ativos
        </h2>
        <span className="text-xs text-slate-500">
          {events.length} detectado{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-slate-600 text-sm">Nenhum evento detectado</p>
          <p className="text-slate-700 text-xs mt-1">
            Padrões normais nas últimas rodadas
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50"
            >
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: intensityColor(ev.intensity) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-200 font-medium">
                    {ev.type}
                  </span>
                  <span
                    className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      color: intensityColor(ev.intensity),
                      background: intensityColor(ev.intensity) + "20",
                      border: `1px solid ${intensityColor(ev.intensity)}40`,
                    }}
                  >
                    {intensityLabel(ev.intensity)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
              </div>
              {ev.value !== undefined && (
                <span className="text-lg font-bold font-mono text-slate-400 shrink-0">
                  {ev.value}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
