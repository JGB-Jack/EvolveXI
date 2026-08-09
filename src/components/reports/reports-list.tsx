"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Report = {
  id: string;
  session_id: string;
  player_id: string;
  created_at: string;
  sessions: { date: string; type: string; opponent: string | null } | null;
  players: { first_name: string; last_name: string } | null;
};

export function ReportsList({ reports }: { reports: Report[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) =>
      `${r.players?.first_name} ${r.players?.last_name}`
        .toLowerCase()
        .includes(q),
    );
  }, [reports, search]);

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No reports yet</CardTitle>
          <CardDescription>
            Generate a player&apos;s report during an assessment session to
            see it here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by player name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-background"
      />
      {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
      <div className="space-y-3 sm:hidden">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {r.players?.first_name} {r.players?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.sessions?.type}
                  {r.sessions?.opponent ? ` vs ${r.sessions.opponent}` : ""}
                  {" · "}
                  {r.sessions?.date}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generated {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                render={
                  <Link href={`/sessions/${r.session_id}/report/${r.player_id}`} />
                }
              >
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.players?.first_name} {r.players?.last_name}
                </TableCell>
                <TableCell>
                  {r.sessions?.type}
                  {r.sessions?.opponent ? ` vs ${r.sessions.opponent}` : ""}
                  {" · "}
                  {r.sessions?.date}
                </TableCell>
                <TableCell>
                  {new Date(r.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    render={
                      <Link href={`/sessions/${r.session_id}/report/${r.player_id}`} />
                    }
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
