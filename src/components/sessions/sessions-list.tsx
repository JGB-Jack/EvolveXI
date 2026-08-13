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

export function SessionsList({ sessions }: { sessions: Session[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) =>
      playerNamesFull(session.session_players).toLowerCase().includes(q),
    );
  }, [sessions, search]);

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
        placeholder="Search by player name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-background"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No matching sessions</CardTitle>
            <CardDescription>
              No sessions include a player matching &quot;{search}&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
          <div className="space-y-1.5 sm:hidden">
            {filtered.map((session) => (
              <Card key={session.id}>
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
                      <Badge variant="outline" className="shrink-0">Complete</Badge>
                    ) : (
                      <Badge className="shrink-0">In progress</Badge>
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
                        <Badge variant="outline">Complete</Badge>
                      ) : (
                        <Badge>In progress</Badge>
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
