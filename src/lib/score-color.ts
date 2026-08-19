// Shared red/amber/green banding for 1-5 scores. Amber covers the whole
// middle of the scale rather than a narrow sliver, so a merely
// below-average score doesn't read as starkly "red" as a genuinely poor one.
export function scoreColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-700 dark:text-green-400 font-semibold";
  if (score >= 2.5) return "text-amber-700 dark:text-amber-400 font-semibold";
  return "text-red-700 dark:text-red-400 font-semibold";
}

// Same bands as scoreColorClass, as a solid fill for bars/dots instead of text.
export function scoreBarColorClass(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 4) return "bg-green-600 dark:bg-green-500";
  if (score >= 2.5) return "bg-amber-500 dark:bg-amber-500";
  return "bg-red-600 dark:bg-red-500";
}

// Same bands again, as a text/currentColor class for SVG strokes (progress rings).
export function scoreStrokeColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-600 dark:text-green-500";
  if (score >= 2.5) return "text-amber-500 dark:text-amber-500";
  return "text-red-600 dark:text-red-500";
}
