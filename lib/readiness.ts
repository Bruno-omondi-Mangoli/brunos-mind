export type ConceptStats = {
  conceptId: string;
  areaId: string;
  recent: boolean[];
  box: number;
  gameRatio: number | null;
};

export type Area = { id: string; weight: number; totalConcepts: number };

export function conceptMastery(s: ConceptStats): number {
  const last = s.recent.slice(-5);
  let acc = 0;
  if (last.length > 0) {
    let num = 0;
    let den = 0;
    last.forEach((ok, i) => {
      const w = i + 1;
      num += ok ? w : 0;
      den += w;
    });
    acc = num / den;
  }
  const boxScore = (Math.min(Math.max(s.box, 1), 5) - 1) / 4;
  const game = s.gameRatio ?? acc;
  return 0.6 * acc + 0.25 * boxScore + 0.15 * game;
}

export function readiness(areas: Area[], stats: ConceptStats[]) {
  const mastery: Record<string, number> = {};
  stats.forEach((s) => {
    mastery[s.conceptId] = conceptMastery(s);
  });

  const sumWeights = areas.reduce((t, a) => t + a.weight, 0) || 1;

  const areaResults = areas.map((a) => {
    const inArea = stats.filter((s) => s.areaId === a.id);
    const sum = inArea.reduce((t, s) => t + (mastery[s.conceptId] ?? 0), 0);
    const score = a.totalConcepts > 0 ? sum / a.totalConcepts : 0;
    return {
      id: a.id,
      weight: a.weight,
      score,
      attempted: inArea.filter((s) => s.recent.length > 0).length,
      total: a.totalConcepts,
    };
  });

  const overall = areaResults.reduce((t, r) => t + (r.weight / sumWeights) * r.score, 0) * 100;
  const total = areas.reduce((t, a) => t + a.totalConcepts, 0);
  const attempted = areaResults.reduce((t, r) => t + r.attempted, 0);
  const coverage = total > 0 ? attempted / total : 0;

  return {
    overall: Math.round(overall),
    coverage,
    lowConfidence: coverage < 0.5,
    areas: areaResults,
    mastery,
  };
}

export function scoreLabel(overall: number): string {
  if (overall < 40) return "Early days";
  if (overall < 70) return "Building";
  return "Strong";
}