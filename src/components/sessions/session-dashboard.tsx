"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  primary_position: string;
};

type PlayerScore = {
  player: Player;
  pillarAverages: Record<string, number | null>;
  overall: number | null;
};

function scoreColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-700 dark:text-green-400 font-semibold";
  if (score >= 3) return "text-amber-700 dark:text-amber-400 font-semibold";
  return "text-red-700 dark:text-red-400 font-semibold";
}

function formatScore(score: number | null): string {
  return score === null ? "-" : score.toFixed(1);
}

export function SessionDashboard({
  session,
  pillarIds,
  playerScores,
}: {
  session: { id: string; date: string; type: string; opponent: string | null };
  pillarIds: string[];
  playerScores: PlayerScore[];
}) {
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function toggleSort(key: string) {
    setSortDir((d) => (sortKey === key ? (d === 1 ? -1 : 1) : 1));
    setSortKey(key);
  }

  const sorted = useMemo(() => {
    const copy = [...playerScores];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = `${a.player.last_name} ${a.player.first_name}`.localeCompare(
          `${b.player.last_name} ${b.player.first_name}`,
        );
      } else if (sortKey === "overall") {
        cmp = (a.overall ?? -1) - (b.overall ?? -1);
      } else {
        cmp = (a.pillarAverages[sortKey] ?? -1) - (b.pillarAverages[sortKey] ?? -1);
      }
      return cmp * sortDir;
    });
    return copy;
  }, [playerScores, sortKey, sortDir]);

  const sessionLabel = session.opponent
    ? `${session.type} vs ${session.opponent}`
    : session.type;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Session dashboard</h1>
        <p className="text-muted-foreground">
          {sessionLabel} &middot; {session.date}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {pillarIds.map((id) => (
            <Badge key={id} variant="secondary">
              {PILLAR_NAME[id]}
            </Badge>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort("name")}
            >
              Player
            </TableHead>
            {pillarIds.map((id) => (
              <TableHead
                key={id}
                className="cursor-pointer select-none"
                onClick={() => toggleSort(id)}
              >
                {PILLAR_NAME[id]}
              </TableHead>
            ))}
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort("overall")}
            >
              Overall
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(({ player, pillarAverages, overall }) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">
                {player.first_name} {player.last_name}
              </TableCell>
              {pillarIds.map((id) => (
                <TableCell key={id} className={cn(scoreColorClass(pillarAverages[id]))}>
                  {formatScore(pillarAverages[id])}
                </TableCell>
              ))}
              <TableCell className={cn(scoreColorClass(overall))}>
                {formatScore(overall)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  render={
                    <Link href={`/sessions/${session.id}/report/${player.id}`} />
                  }
                >
                  View report
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Player profiles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playerScores.map(({ player, pillarAverages }) => {
            const data = pillarIds.map((id) => ({
              pillar: PILLAR_NAME[id],
              score: pillarAverages[id] ?? 0,
            }));
            return (
              <Card key={player.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {player.first_name} {player.last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                      <Radar
                        dataKey="score"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
