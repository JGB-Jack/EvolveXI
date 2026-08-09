import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string) ?? "coach";

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band")
    .eq("coach_id", user!.id)
    .single();

  const { count: squadCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("team_id", team!.id)
    .eq("active", true);

  const { count: sessionCount } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("team_id", team!.id);

  const { data: inProgress } = await supabase
    .from("sessions")
    .select("id, date, type, session_players(player_id, completed_at)")
    .eq("team_id", team!.id)
    .is("completed_at", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resumePlayerId = inProgress
    ? (inProgress.session_players.find((sp) => !sp.completed_at) ??
        inProgress.session_players[0])?.player_id
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          {team?.name} &middot; {team?.age_band}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/squad" className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>{squadCount ?? 0}</CardTitle>
              <CardDescription>Players in your squad</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/sessions" className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>{sessionCount ?? 0}</CardTitle>
              <CardDescription>Sessions run so far</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {inProgress && resumePlayerId && (
        <Link
          href={`/sessions/${inProgress.id}/assess/${resumePlayerId}`}
          className="block"
        >
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Resume in-progress session</CardTitle>
              <CardDescription>
                {inProgress.type} &middot; {inProgress.date}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      )}
    </div>
  );
}
