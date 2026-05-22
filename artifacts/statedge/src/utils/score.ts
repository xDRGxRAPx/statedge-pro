import type {
  FrequencyResult,
  DeviationResult,
  GameEvent,
  ScoreResult,
} from "./types";

const BASE = { red: 0.475, black: 0.475, white: 0.05 };
const MAX = { red: 0.55, black: 0.55, white: 0.10 };

export function calculateScore(
  freq: FrequencyResult,
  deviation: DeviationResult,
  events: GameEvent[]
): ScoreResult {
  let red = BASE.red;
  let black = BASE.black;
  let white = BASE.white;

  // Ajuste por desvio: se acima da média → reduz, se abaixo → aumenta levemente
  if (deviation.desvio_red > 0.05) red -= deviation.desvio_red * 0.4;
  else if (deviation.desvio_red < -0.05) red -= deviation.desvio_red * 0.3;

  if (deviation.desvio_black > 0.05) black -= deviation.desvio_black * 0.4;
  else if (deviation.desvio_black < -0.05) black -= deviation.desvio_black * 0.3;

  if (deviation.desvio_white > 0.02) white -= deviation.desvio_white * 0.3;
  else if (deviation.desvio_white < -0.02) white -= deviation.desvio_white * 0.4;

  // Ajuste por eventos de ausência de branco
  for (const ev of events) {
    if (ev.id === "white50") white += 0.04;
    else if (ev.id === "white25") white += 0.025;
    else if (ev.id === "white10") white += 0.01;
  }

  // Aplicar limites
  red = Math.max(0.3, Math.min(MAX.red, red));
  black = Math.max(0.3, Math.min(MAX.black, black));
  white = Math.max(0.005, Math.min(MAX.white, white));

  // Normalizar para soma = 1
  const total = red + black + white;
  return {
    red: parseFloat((red / total).toFixed(4)),
    black: parseFloat((black / total).toFixed(4)),
    white: parseFloat((white / total).toFixed(4)),
  };
}

export function scoreToPercent(score: ScoreResult) {
  return {
    red: Math.round(score.red * 100),
    black: Math.round(score.black * 100),
    white: Math.round(score.white * 100),
  };
}
