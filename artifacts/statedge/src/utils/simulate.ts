import type { HistoryItem } from "./types";

function randomColor(): "red" | "black" | "white" {
  const r = Math.random();
  if (r < 0.475) return "red";
  if (r < 0.95) return "black";
  return "white";
}

function randomMultiplier(): number {
  const r = Math.random();
  if (r < 0.55) return parseFloat((1 + Math.random() * 0.5).toFixed(2));
  if (r < 0.80) return parseFloat((1.5 + Math.random() * 1.5).toFixed(2));
  if (r < 0.95) return parseFloat((3 + Math.random() * 7).toFixed(2));
  return parseFloat((10 + Math.random() * 20).toFixed(2));
}

export function generateSimulatedDouble(count: number): HistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sim-d-${i}`,
    game_type: "double" as const,
    color: randomColor(),
    multiplier: null,
    created_at: new Date(Date.now() - (count - i) * 22000).toISOString(),
  }));
}

export function generateSimulatedCrash(count: number): HistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sim-c-${i}`,
    game_type: "crash" as const,
    color: null,
    multiplier: randomMultiplier(),
    created_at: new Date(Date.now() - (count - i) * 18000).toISOString(),
  }));
}
