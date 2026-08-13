import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { archiveSession, restoreSession } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/button";
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

type SessionPlayerRow = {
  players: { first_name: string; last_name: string }[] | null;
};

function playerNamesSummary(sessionPlayers: SessionPlayerRow[], max = 3): string {
  const names = sessionPlayers
    .flatMap((sp) => sp.players ?? [])
    .map((p) => p.first_name);
  if (names.length === 0) return "No players";
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

function playerNamesFull(sessionPlayers: SessionPlayerRow[]): string {
  return sessionPlayers
    .flatMap((sp) => sp.players ?? [])
    .map((p) => `${p.first_name} ${p.last_name}`)
    .join(", ");
}

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .single();

  if (!team) redirect("/onboarding/team");

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, date, type, opponent, completed_at, session_pillars(pillar_id), session_players(player_id, players(first_name, last_name))",
    )
    .eq("team_id", team.id)
    .is("archived_at", null)
    .order("date", { ascending: false });

  const { data: archivedSessions } = await supabase
    .from("sessions")
    .select(
      "id, date, type, opponent, session_players(player_id, players(first_name, last_name))",
    )
    .eq("team_id", team.id)
    .not("archived_at", "is", null)
    .order("date", { ascending: false });

  const hasSessions = (sessions?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sessions</h1>
          <p className="text-white/70">
            Your assessment session history.
          </p>
        </div>
        <Button render={<Link href="/sessions/new/details" />}>
          <Plus className="size-4" />
          New session
        </Button>
      </div>

      {!hasSessions ? (
        <Card>
          <CardHeader>
            <CardTitle>No sessions yet</CardTitle>
            <CardDescription>
              Start your first assessment session to see it here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
          <div className="space-y-3 sm:hidden">
            {sessions!.map((session) => (
              <Card key={session.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {session.type}
                        {session.opponent ? ` vs ${session.opponent}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.date}
                      </p>
                    </div>
                    {session.completed_at ? (
                      <Badge variant="outline">Complete</Badge>
                    ) : (
                      <Badge>In progress</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {session.session_pillars.map((sp) => (
                      <Badge key={sp.pillar_id} variant="secondary">
                        {PILLAR_LABEL[sp.pillar_id]}
                      </Badge>
                    ))}
                  </div>
                  <p
                    className="text-sm text-muted-foreground"
                    title={playerNamesFull(session.session_players)}
                  >
                    {playerNamesSummary(session.session_players)}
                  </p>
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
                {sessions!.map((session) => (
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

      {archivedSessions && archivedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Archived sessions ({archivedSessions.length})
            </CardTitle>
            <CardDescription>
              Archived sessions are hidden from your session history but
              their data is kept. Restore anyone archived by mistake.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {archivedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate">
                    {session.type}
                    {session.opponent ? ` vs ${session.opponent}` : ""}
                    <span className="text-muted-foreground"> &middot; {session.date}</span>
                  </p>
                  <p
                    className="truncate text-sm text-muted-foreground"
                    title={playerNamesFull(session.session_players)}
                  >
                    {playerNamesSummary(session.session_players)}
                  </p>
                </div>
                <form action={restoreSession.bind(null, session.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    Restore
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
