// Shared red/amber/green banding for 1-5 scores. Amber covers the whole
// middle of the scale rather than a narrow sliver, so a merely
// below-average score doesn't read as starkly "red" as a genuinely poor one.
export function scoreColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-700 dark:text-green-400 font-semibold";
  if (score >= 2.5) return "text-amber-700 dark:text-amber-400 font-semibold";
  return "text-red-700 dark:text-red-400 font-semibold";
}
