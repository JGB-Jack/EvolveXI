"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { scoreColorClass } from "@/lib/score-color";

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

type Player = {
  playerId: string;
  name: string;
  position: string;
  overall: number;
  pillarAverages: Record<string, number | null>;
};

function formatScore(score: number | null): string {
  return score === null ? "-" : score.toFixed(1);
}

export function RankingsTable({
  players,
  pillars,
}: {
  players: Player[];
  pillars: { id: string; name: string }[];
}) {
  const [sortKey, setSortKey] = useState<string>("overall");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(key: string) {
    setSortDir((d) => (sortKey === key ? (d === 1 ? -1 : 1) : -1));
    setSortKey(key);
  }

  const sorted = useMemo(() => {
    const copy = [...players];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "overall") {
        cmp = a.overall - b.overall;
      } else {
        cmp = (a.pillarAverages[sortKey] ?? -1) - (b.pillarAverages[sortKey] ?? -1);
      }
      return cmp * sortDir;
    });
    return copy;
  }, [players, sortKey, sortDir]);

  return (
    <>
      {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
      <div className="space-y-1.5 sm:hidden">
        {sorted.map((player, index) => (
          <Card key={player.playerId}>
            <CardContent className="space-y-0.5 py-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground">#{index + 1}</span>{" "}
                  {player.name}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {POSITION_LABEL[player.position] ?? player.position}
                  </span>
                </p>
                <span className={cn("text-base", scoreColorClass(player.overall))}>
                  {formatScore(player.overall)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {pillars.map((pillar) => (
                  <span key={pillar.id} className="text-muted-foreground">
                    {pillar.name}{" "}
                    <span className={scoreColorClass(player.pillarAverages[pillar.id])}>
                      {formatScore(player.pillarAverages[pillar.id])}
                    </span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                Player
              </TableHead>
              <TableHead>Position</TableHead>
              {pillars.map((pillar) => (
                <TableHead
                  key={pillar.id}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort(pillar.id)}
                >
                  {pillar.name}
                </TableHead>
              ))}
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("overall")}
              >
                Overall
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((player, index) => (
              <TableRow key={player.playerId}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell>
                  {POSITION_LABEL[player.position] ?? player.position}
                </TableCell>
                {pillars.map((pillar) => (
                  <TableCell
                    key={pillar.id}
                    className={cn(scoreColorClass(player.pillarAverages[pillar.id]))}
                  >
                    {formatScore(player.pillarAverages[pillar.id])}
                  </TableCell>
                ))}
                <TableCell className={cn(scoreColorClass(player.overall))}>
                  {formatScore(player.overall)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
