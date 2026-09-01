import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SquadView } from "@/components/squad/squad-view";

export default async function SquadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band")
    .eq("coach_id", user.id)
    .single();

  if (!team) redirect("/onboarding/team");

  const { data: players, error } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, dob, gender, primary_position, secondary_position, squad_number",
    )
    .eq("team_id", team.id)
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  const { data: archivedPlayers, error: archivedError } = await supabase
    .from("players")
    .select("id, first_name, last_name, primary_position")
    .eq("team_id", team.id)
    .eq("active", false)
    .order("updated_at", { ascending: false });

  if (archivedError) {
    throw new Error(archivedError.message);
  }

  // Distinct completed sessions each player has been rated in - same
  // "session must be completed" definition used everywhere else, so a
  // player who's individually done but whose session isn't closed out
  // yet isn't counted as assessed here either.
  const { data: assessmentSessions } = await supabase
    .from("assessments")
    .select("player_id, session_id, sessions!inner(team_id, completed_at)")
    .eq("sessions.team_id", team.id)
    .not("sessions.completed_at", "is", null);

  const sessionsByPlayer = new Map<string, Set<string>>();
  for (const row of assessmentSessions ?? []) {
    const sessions = sessionsByPlayer.get(row.player_id) ?? new Set<string>();
    sessions.add(row.session_id);
    sessionsByPlayer.set(row.player_id, sessions);
  }
  const assessmentCounts = Object.fromEntries(
    Array.from(sessionsByPlayer.entries()).map(([playerId, sessions]) => [
      playerId,
      sessions.size,
    ]),
  );

  return (
    <SquadView
      teamId={team.id}
      teamName={team.name}
      teamAgeBand={team.age_band}
      players={players ?? []}
      archivedPlayers={archivedPlayers ?? []}
      assessmentCounts={assessmentCounts}
    />
  );
}
