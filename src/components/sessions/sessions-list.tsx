"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { archiveSession } from "@/lib/actions/sessions";
import { playerNamesSummary, playerNamesFull } from "@/lib/player-names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus } from "lucide-react";

const PILLAR_LABEL: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

type Session = {
  id: string;
  date: string;
  type: string;
  opponent: string | null;
  completed_at: string | null;
  session_pillars: { pillar_id: string }[];
  session_players: {
    player_id: string;
    players: { first_name: string; last_name: string }[] | null;
  }[];
};

const RECENT_WINDOW_DAYS = 60;

export function SessionsList({ sessions }: { sessions: Session[] }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Searching looks across every session regardless of age, so a coach
  // can always find an older one by name - the date window only applies
  // to browsing without a search query.
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RECENT_WINDOW_DAYS);
    return d.toISOString().slice(0, 10);
  }, []);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const players = playerNamesFull(session.session_players).toLowerCase();
      const opponent = session.opponent?.toLowerCase() ?? "";
      return players.includes(q) || opponent.includes(q);
    });
  }, [sessions, search]);

  const isSearching = search.trim().length > 0;
  const filtered = useMemo(() => {
    if (isSearching || showAll) return searched;
    return searched.filter((session) => session.date >= cutoffDate);
  }, [searched, isSearching, showAll, cutoffDate]);

  const hiddenCount = isSearching
    ? 0
    : sessions.filter((s) => s.date < cutoffDate).length;

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No sessions yet</CardTitle>
          <CardDescription>
            Start your first assessment session to see it here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by player or opposition..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-background"
      />

      {!isSearching && hiddenCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <span>
            {showAll
              ? "Showing all sessions"
              : `Showing sessions from the last ${RECENT_WINDOW_DAYS} days`}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show recent only" : `Show all (${hiddenCount} older)`}
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No matching sessions</CardTitle>
            <CardDescription>
              No sessions match &quot;{search}&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
          <div className="space-y-1.5 sm:hidden">
            {filtered.map((session) => (
              <Card key={session.id} className="border-b-2 border-b-primary">
                <CardContent className="space-y-1.5 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.type}
                        {session.opponent ? ` vs ${session.opponent}` : ""}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {session.date}
                        </span>
                      </p>
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={playerNamesFull(session.session_players)}
                      >
                        {playerNamesSummary(session.session_players)}
                      </p>
                    </div>
                    {session.completed_at ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                      >
                        Completed
                      </Badge>
                    ) : (
                      <Badge className="shrink-0 bg-amber-500 text-white dark:bg-amber-600">
                        In progress
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {session.session_pillars.map((sp) => (
                      <Badge key={sp.pillar_id} variant="secondary">
                        {PILLAR_LABEL[sp.pillar_id]}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {session.completed_at ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        render={<Link href={`/sessions/${session.id}/dashboard`} />}
                      >
                        Dashboard
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        render={
                          <Link
                            href={`/sessions/${session.id}/assess/${session.session_players[0]?.player_id}`}
                          />
                        }
                      >
                        Resume
                      </Button>
                    )}
                    <form action={archiveSession.bind(null, session.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Archive
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pillars</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.date}</TableCell>
                    <TableCell>
                      {session.type}
                      {session.opponent ? ` vs ${session.opponent}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {session.session_pillars.map((sp) => (
                          <Badge key={sp.pillar_id} variant="secondary">
                            {PILLAR_LABEL[sp.pillar_id]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-48"
                      title={playerNamesFull(session.session_players)}
                    >
                      {playerNamesSummary(session.session_players)}
                    </TableCell>
                    <TableCell>
                      {session.completed_at ? (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                        >
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white dark:bg-amber-600">
                          In progress
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.completed_at ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          render={<Link href={`/sessions/${session.id}/dashboard`} />}
                        >
                          Dashboard
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          render={
                            <Link
                              href={`/sessions/${session.id}/assess/${session.session_players[0]?.player_id}`}
                            />
                          }
                        >
                          Resume
                        </Button>
                      )}
                      <form
                        action={archiveSession.bind(null, session.id)}
                        className="inline"
                      >
                        <Button type="submit" size="sm" variant="ghost">
                          Archive
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
