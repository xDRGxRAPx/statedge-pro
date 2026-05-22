import type { FrequencyResult, DeviationResult } from "./types";

const BASE = { red: 0.475, black: 0.475, white: 0.05 };

export function calculateDeviation(freq: FrequencyResult): DeviationResult {
  return {
    desvio_red: parseFloat(((freq.red_pct / 100) - BASE.red).toFixed(4)),
    desvio_black: parseFloat(((freq.black_pct / 100) - BASE.black).toFixed(4)),
    desvio_white: parseFloat(((freq.white_pct / 100) - BASE.white).toFixed(4)),
  };
}

export function deviationLabel(dev: number): string {
  if (Math.abs(dev) < 0.03) return "normal";
  if (dev > 0) return "acima";
  return "abaixo";
}

export function deviationColor(dev: number): string {
  if (Math.abs(dev) < 0.03) return "#64748b";
  if (dev > 0) return "#f59e0b";
  return "#22d3ee";
}
