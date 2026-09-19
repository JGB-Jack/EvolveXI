// The single place "overall score" is calculated, so every screen agrees
// on the same number. `weights` is optional everywhere - omitted, null,
// or missing a given pillar's key all mean weight 1 for that pillar, so
// a team that has never set custom weights (pillar_weights = null) gets
// exactly today's plain average.

export type PillarScoreResult = {
  pillarAverages: Record<string, number | null>;
  overall: number | null;
};

// For callers holding raw, ungrouped scores per pillar (e.g. every
// question's score for a session).
export function computeOverallFromRawScores(
  scoresByPillar: Record<string, number[]>,
  weights?: Record<string, number> | null,
): PillarScoreResult {
  const pillarAverages: Record<string, number | null> = {};
  for (const [pillarId, scores] of Object.entries(scoresByPillar)) {
    pillarAverages[pillarId] =
      scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  }
  return {
    pillarAverages,
    overall: computeOverallFromPillarAverages(pillarAverages, weights),
  };
}

// For callers that already have one average per pillar (not raw scores)
// and just need them combined the same way everywhere else does.
export function computeOverallFromPillarAverages(
  pillarAverages: Record<string, number | null | undefined>,
  weights?: Record<string, number> | null,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [pillarId, value] of Object.entries(pillarAverages)) {
    if (value === null || value === undefined) continue;
    const rawWeight = weights?.[pillarId];
    const weight =
      typeof rawWeight === "number" && Number.isFinite(rawWeight) && rawWeight > 0
        ? rawWeight
        : 1;
    weightedSum += value * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : null;
}
