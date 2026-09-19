// The single place "overall score" is calculated, so every screen agrees
// on the same number. Currently always equal-weighted (every pillar with
// at least one score counts the same toward the overall) - this is also
// where future pillar weighting would plug in, as an optional weights
// argument, without touching any of the 6+ places that call this.

export type PillarScoreResult = {
  pillarAverages: Record<string, number | null>;
  overall: number | null;
};

// For callers holding raw, ungrouped scores per pillar (e.g. every
// question's score for a session).
export function computeOverallFromRawScores(
  scoresByPillar: Record<string, number[]>,
): PillarScoreResult {
  const pillarAverages: Record<string, number | null> = {};
  for (const [pillarId, scores] of Object.entries(scoresByPillar)) {
    pillarAverages[pillarId] =
      scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  }
  return { pillarAverages, overall: computeOverallFromPillarAverages(pillarAverages) };
}

// For callers that already have one average per pillar (not raw scores)
// and just need them combined the same way everywhere else does.
export function computeOverallFromPillarAverages(
  pillarAverages: Record<string, number | null | undefined>,
): number | null {
  const present = Object.values(pillarAverages).filter(
    (v): v is number => v !== null && v !== undefined,
  );
  return present.length > 0
    ? present.reduce((sum, v) => sum + v, 0) / present.length
    : null;
}
