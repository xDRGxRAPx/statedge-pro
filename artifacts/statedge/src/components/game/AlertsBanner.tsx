import { AnimatePresence, motion } from "framer-motion";
import type { GameEvent } from "../../utils/types";

type Props = { events: GameEvent[] };

export function AlertsBanner({ events }: Props) {
  const high = events.filter((e) => e.intensity === "alta");
  const medium = events.filter((e) => e.intensity === "media");

  const alerts = [
    ...high.map((e) => ({ ...e, alertType: "red" as const })),
    ...medium.map((e) => ({ ...e, alertType: "yellow" as const })),
  ].slice(0, 3);

  if (!alerts.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {alerts.map((alert) => {
          const isRed = alert.alertType === "red";
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                isRed
                  ? "bg-red-950/40 border-red-800/50 text-red-300"
                  : "bg-amber-950/40 border-amber-800/50 text-amber-300"
              }`}
            >
              <span className="text-lg">{isRed ? "🔴" : "🟡"}</span>
              <div>
                <span className="font-semibold">{alert.type}: </span>
                <span className="opacity-80">{alert.description}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
