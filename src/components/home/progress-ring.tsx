import { cn } from "@/lib/utils";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({
  percent,
  colorClass,
  trackColorClass = "text-muted",
  label,
}: {
  percent: number;
  colorClass: string;
  trackColorClass?: string;
  label?: string;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 50 50" className="size-14 -rotate-90">
        <circle
          cx="25"
          cy="25"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className={trackColorClass}
        />
        <circle
          cx="25"
          cy="25"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={colorClass}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums",
          colorClass,
        )}
      >
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
