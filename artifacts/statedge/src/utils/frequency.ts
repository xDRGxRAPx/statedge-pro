import type { HistoryItem, FrequencyResult, WindowsResult } from "./types";

export function getWindows(history: HistoryItem[]): WindowsResult {
  return {
    last10: history.slice(-10),
    last20: history.slice(-20),
    last50: history.slice(-50),
    last100: history.slice(-100),
  };
}

export function calculateFrequency(window: HistoryItem[]): FrequencyResult {
  const items = window.filter((h) => h.color !== null);
  const total = items.length || 1;
  const red = items.filter((h) => h.color === "red").length;
  const black = items.filter((h) => h.color === "black").length;
  const white = items.filter((h) => h.color === "white").length;

  return {
    red_pct: Math.round((red / total) * 100),
    black_pct: Math.round((black / total) * 100),
    white_pct: Math.round((white / total) * 100),
    red_count: red,
    black_count: black,
    white_count: white,
    total,
  };
}
