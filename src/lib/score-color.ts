// Shared banding for 1-5 scores, all built from the theme's own primary
// colour rather than fixed red/amber/green - a lower score just fades to a
// lighter tint of the same brand colour, so it always matches whatever the
// current theme is instead of clashing with it.
//
// These arbitrary-value classes must appear as full literal strings, here
// and anywhere else that needs the same tint (e.g. a ProgressRing track
// colour) - Tailwind generates CSS by scanning source files for literal
// class names, so building one at runtime from a shared JS constant (e.g.
// `text-[${TINT}]`) produces a class Tailwind never sees and silently
// generates no CSS for. The full string to reuse elsewhere is:
// "text-[color-mix(in_oklch,var(--primary),white_55%)]" (or "bg-[...]").

export function scoreColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-primary font-semibold";
  if (score >= 2.5) return "text-[color-mix(in_oklch,var(--primary),white_35%)] font-semibold";
  return "text-[color-mix(in_oklch,var(--primary),white_55%)] font-semibold";
}

// Same bands as scoreColorClass, as a solid fill for bars/dots instead of text.
export function scoreBarColorClass(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 4) return "bg-primary";
  if (score >= 2.5) return "bg-[color-mix(in_oklch,var(--primary),white_35%)]";
  return "bg-[color-mix(in_oklch,var(--primary),white_55%)]";
}

// Same bands again, as a text/currentColor class for SVG strokes (progress rings).
export function scoreStrokeColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-primary";
  if (score >= 2.5) return "text-[color-mix(in_oklch,var(--primary),white_35%)]";
  return "text-[color-mix(in_oklch,var(--primary),white_55%)]";
}
