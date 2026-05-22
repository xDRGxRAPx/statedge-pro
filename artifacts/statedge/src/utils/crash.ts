import type { HistoryItem, CrashAnalysis } from "./types";

export function analyzeCrash(history: HistoryItem[]): CrashAnalysis {
  const items = history.filter(
    (h) => h.game_type === "crash" && h.multiplier !== null
  );

  if (!items.length) {
    return {
      baixa_pct: 0,
      media_pct: 0,
      alta_pct: 0,
      explosiva_pct: 0,
      media_multipicador: 0,
      sequencia_baixa: 0,
      ausencia_explosao: 0,
      intervalo_medio_pico: 0,
      ultimo_pico: null,
    };
  }

  const mults = items.map((h) => h.multiplier as number);
  const total = mults.length;

  const baixa = mults.filter((m) => m < 1.5).length;
  const media = mults.filter((m) => m >= 1.5 && m < 3).length;
  const alta = mults.filter((m) => m >= 3 && m < 10).length;
  const explosiva = mults.filter((m) => m >= 10).length;

  const avg = mults.reduce((a, b) => a + b, 0) / total;

  // Sequência atual de velas baixas
  let seqBaixa = 0;
  for (let i = mults.length - 1; i >= 0; i--) {
    if (mults[i] < 1.5) seqBaixa++;
    else break;
  }

  // Ausência de explosão (>=10x)
  let ausenciaExplosao = 0;
  for (let i = mults.length - 1; i >= 0; i--) {
    if (mults[i] < 10) ausenciaExplosao++;
    else break;
  }

  // Picos (>=10x) e intervalo médio entre eles
  const peakIndices: number[] = [];
  mults.forEach((m, i) => { if (m >= 10) peakIndices.push(i); });

  let intervaloMedio = 0;
  if (peakIndices.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < peakIndices.length; i++) {
      gaps.push(peakIndices[i] - peakIndices[i - 1]);
    }
    intervaloMedio = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }

  const ultimoPico =
    peakIndices.length > 0
      ? mults[peakIndices[peakIndices.length - 1]]
      : null;

  return {
    baixa_pct: Math.round((baixa / total) * 100),
    media_pct: Math.round((media / total) * 100),
    alta_pct: Math.round((alta / total) * 100),
    explosiva_pct: Math.round((explosiva / total) * 100),
    media_multipicador: parseFloat(avg.toFixed(2)),
    sequencia_baixa: seqBaixa,
    ausencia_explosao: ausenciaExplosao,
    intervalo_medio_pico: intervaloMedio,
    ultimo_pico: ultimoPico,
  };
}
