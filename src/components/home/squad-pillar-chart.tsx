"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlayerAvatar } from "@/components/player-avatar";
import { scoreColorClass } from "@/lib/score-color";

type PillarPlayer = {
  playerId: string;
  name: string;
  squadNumber: number | null;
  score: number;
};

export function SquadPillarChart({
  data,
  playersByPillar,
}: {
  data: { pillar: string; score: number }[];
  playersByPillar: Record<string, PillarPlayer[]>;
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
            <Dialog key={pillar}>
              <DialogTrigger
                className="flex flex-1 flex-col items-center gap-1.5"
                aria-label={`${pillar} breakdown by player`}
              >
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
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{pillar}</DialogTitle>
                  <DialogDescription>
                    Top and bottom scoring player, based on their most recent{" "}
                    {pillar.toLowerCase()} rating.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1">
                  {(() => {
                    const players = playersByPillar[pillar] ?? [];
                    const top = players[0];
                    const bottom =
                      players.length > 1 ? players[players.length - 1] : undefined;
                    const rows = bottom
                      ? [
                          { label: "Top", player: top },
                          { label: "Bottom", player: bottom },
                        ]
                      : top
                        ? [{ label: null, player: top }]
                        : [];
                    return rows.map(({ label, player: p }) => (
                      <div
                        key={label ?? p.playerId}
                        className="flex items-center gap-2.5 border-b py-2 last:border-b-0"
                      >
                        {label && (
                          <span className="w-14 shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {label}
                          </span>
                        )}
                        <PlayerAvatar squadNumber={p.squadNumber} />
                        <span className="flex-1 text-sm font-medium">
                          {p.name}
                        </span>
                        <span className={scoreColorClass(p.score)}>
                          {p.score.toFixed(1)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
