import { cn } from "@/lib/utils";

export function KpiBar({
  percent,
  colorClass,
}: {
  percent: number;
  colorClass: string;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", colorClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
