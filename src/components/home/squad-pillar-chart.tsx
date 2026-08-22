import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function SquadPillarChart({
  data,
}: {
  data: { pillar: string; score: number }[];
}) {
  return (
    <Card className="border-b-2 border-b-primary">
      <CardHeader>
        <CardTitle className="text-base">Squad 5 Pillar Breakdown</CardTitle>
        <CardDescription>
          Overall squad averages from most recent sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 px-1" style={{ height: 120 }}>
          {data.map(({ pillar, score }) => (
            <div key={pillar} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-bold tabular-nums text-primary">
                {score.toFixed(1)}
              </span>
              <div
                className="w-4 rounded-t-[4px] rounded-b-[2px]"
                style={{
                  height: `${(score / 5) * 88}px`,
                  background:
                    "linear-gradient(180deg, color-mix(in oklch, var(--primary), white 40%), color-mix(in oklch, var(--primary), black 20%))",
                }}
              />
              <span className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                {pillar.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
