export type Color = "red" | "black" | "white";
export type GameType = "double" | "crash";
export type Intensity = "alta" | "media" | "baixa";

export type HistoryItem = {
  id: string;
  game_type: GameType;
  color: Color | null;
  multiplier: number | null;
  created_at: string;
};

export type FrequencyResult = {
  red_pct: number;
  black_pct: number;
  white_pct: number;
  red_count: number;
  black_count: number;
  white_count: number;
  total: number;
};

export type DeviationResult = {
  desvio_red: number;
  desvio_black: number;
  desvio_white: number;
};

export type GameEvent = {
  id: string;
  type: string;
  description: string;
  intensity: Intensity;
  value?: number;
};

export type ScoreResult = {
  red: number;
  black: number;
  white: number;
};

export type CrashAnalysis = {
  baixa_pct: number;
  media_pct: number;
  alta_pct: number;
  explosiva_pct: number;
  media_multipicador: number;
  sequencia_baixa: number;
  ausencia_explosao: number;
  intervalo_medio_pico: number;
  ultimo_pico: number | null;
};

export type WindowsResult = {
  last10: HistoryItem[];
  last20: HistoryItem[];
  last50: HistoryItem[];
  last100: HistoryItem[];
};
