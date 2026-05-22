import type { HistoryItem, GameEvent, Intensity } from "./types";

export function detectEvents(history: HistoryItem[]): GameEvent[] {
  const events: GameEvent[] = [];
  const items = history.filter((h) => h.color !== null);
  if (items.length < 5) return events;

  // 1–3: Sequência da mesma cor (>=3, >=5, >=7)
  let streak = 1;
  let streakColor = items[items.length - 1].color;
  for (let i = items.length - 2; i >= 0; i--) {
    if (items[i].color === streakColor) {
      streak++;
    } else break;
  }

  if (streak >= 7) {
    events.push({
      id: "seq7",
      type: "Sequência Extrema",
      description: `${streak} jogadas seguidas de ${labelColor(streakColor)}`,
      intensity: "alta",
      value: streak,
    });
  } else if (streak >= 5) {
    events.push({
      id: "seq5",
      type: "Sequência Longa",
      description: `${streak} jogadas seguidas de ${labelColor(streakColor)}`,
      intensity: "media",
      value: streak,
    });
  } else if (streak >= 3) {
    events.push({
      id: "seq3",
      type: "Sequência Detectada",
      description: `${streak} jogadas seguidas de ${labelColor(streakColor)}`,
      intensity: "baixa",
      value: streak,
    });
  }

  // 4: Alternância perfeita (>=5)
  const last10 = items.slice(-10);
  let alternates = 0;
  for (let i = 1; i < last10.length; i++) {
    const prev = last10[i - 1].color;
    const curr = last10[i].color;
    if (prev !== curr && prev !== "white" && curr !== "white") alternates++;
    else break;
  }
  if (alternates >= 5) {
    events.push({
      id: "alt",
      type: "Alternância Perfeita",
      description: `${alternates} trocas consecutivas sem repetição`,
      intensity: alternates >= 8 ? "alta" : "media",
      value: alternates,
    });
  }

  // 5–7: Ausência de white (>=10, >=25, >=50)
  let ausenciaWhite = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].color !== "white") ausenciaWhite++;
    else break;
  }

  if (ausenciaWhite >= 50) {
    events.push({
      id: "white50",
      type: "Ausência Crítica de Branco",
      description: `${ausenciaWhite} rodadas sem branco aparecer`,
      intensity: "alta",
      value: ausenciaWhite,
    });
  } else if (ausenciaWhite >= 25) {
    events.push({
      id: "white25",
      type: "Ausência Longa de Branco",
      description: `${ausenciaWhite} rodadas sem branco`,
      intensity: "media",
      value: ausenciaWhite,
    });
  } else if (ausenciaWhite >= 10) {
    events.push({
      id: "white10",
      type: "Ausência de Branco",
      description: `${ausenciaWhite} rodadas sem branco`,
      intensity: "baixa",
      value: ausenciaWhite,
    });
  }

  // 8: Quebra de sequência longa (anterior >=5 e atual é diferente)
  const prev5 = items.slice(-8, -1);
  if (prev5.length >= 5) {
    const prevColor = prev5[0].color;
    const allSame = prev5.every((h) => h.color === prevColor);
    const lastItem = items[items.length - 1];
    if (allSame && lastItem.color !== prevColor && lastItem.color !== "white") {
      events.push({
        id: "quebra",
        type: "Quebra de Sequência",
        description: `Inversão após sequência de ${prev5.length}+ ${labelColor(prevColor)}`,
        intensity: "media",
      });
    }
  }

  // 9: Cluster de cores iguais (>=4 das últimas 5)
  const last5 = items.slice(-5);
  const colorCounts: Record<string, number> = {};
  for (const h of last5) {
    if (h.color) colorCounts[h.color] = (colorCounts[h.color] || 0) + 1;
  }
  for (const [cor, count] of Object.entries(colorCounts)) {
    if (count >= 4 && cor !== "white") {
      events.push({
        id: `cluster_${cor}`,
        type: "Cluster de Cor",
        description: `${count} de 5 últimas jogadas foram ${labelColor(cor as "red" | "black")}`,
        intensity: count === 5 ? "alta" : "media",
        value: count,
      });
    }
  }

  // 10: Repetição após alternância
  const last6 = items.slice(-6);
  if (last6.length === 6) {
    const altPart = last6.slice(0, 4);
    const wasAlternating =
      altPart[0].color !== altPart[1].color &&
      altPart[1].color !== altPart[2].color &&
      altPart[2].color !== altPart[3].color;
    const last2Same = last6[4].color === last6[5].color;
    if (wasAlternating && last2Same) {
      events.push({
        id: "rep_alt",
        type: "Repetição pós-Alternância",
        description: `Padrão de repetição após alternância detectado`,
        intensity: "baixa",
      });
    }
  }

  return events;
}

function labelColor(color: string | null): string {
  if (color === "red") return "vermelho";
  if (color === "black") return "preto";
  if (color === "white") return "branco";
  return "?";
}

export function intensityColor(intensity: Intensity): string {
  if (intensity === "alta") return "#ef4444";
  if (intensity === "media") return "#f59e0b";
  return "#64748b";
}

export function intensityLabel(intensity: Intensity): string {
  if (intensity === "alta") return "ALTA";
  if (intensity === "media") return "MÉDIA";
  return "BAIXA";
}
