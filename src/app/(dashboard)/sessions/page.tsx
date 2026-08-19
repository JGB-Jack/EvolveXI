import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { restoreSession } from "@/lib/actions/sessions";
import { playerNamesSummary, playerNamesFull } from "@/lib/player-names";
import { SessionsList } from "@/components/sessions/sessions-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
          <p className="text-muted-foreground">
            Your assessment session history.
          </p>
        </div>
        <Button render={<Link href="/sessions/new/details" />}>
          New session
        </Button>
      </div>

      <SessionsList sessions={sessions ?? []} />

      {archivedSessions && archivedSessions.length > 0 && (
        <Card className="border-b-2 border-b-primary">
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
