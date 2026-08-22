import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssessmentForm } from "@/components/sessions/assessment-form";

export default async function AssessPlayerPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id: sessionId, playerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("id, date, type, opponent, team_id, teams(age_band)")
    .eq("id", sessionId)
    .single();
  if (!sessionRow) notFound();
  const { teams: teamRow, ...session } = sessionRow;
  const teamAgeBand = (teamRow as unknown as { age_band: string }).age_band;

  const { data: sessionPillars } = await supabase
    .from("session_pillars")
    .select("pillar_id")
    .eq("session_id", sessionId);
  const pillarIds = (sessionPillars ?? []).map((p) => p.pillar_id);

  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select("player_id, standout_moment, players(id, first_name, last_name, primary_position, squad_number)")
    .eq("session_id", sessionId);

  type PlayerRow = {
    id: string;
    first_name: string;
    last_name: string;
    primary_position: string;
    squad_number: number | null;
  };

  const ordered = (sessionPlayers ?? [])
    .map((sp) => {
      const p = sp.players as unknown as PlayerRow;
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        primary_position: p.primary_position,
        squad_number: p.squad_number,
        standout_moment: sp.standout_moment as string | null,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const currentIndex = ordered.findIndex((p) => p.id === playerId);
  const player = ordered[currentIndex];
  if (!player) notFound();

  // Below U10-U11, positions aren't fixed (players rotate freely), so every
  // player sees the shared "outfield" set regardless of their nominal
  // position. From U10-U11 up, positional variants (including a
  // goalkeeper-specific Physical set) are matched to the player's actual
  // position instead.
  const isPositionalBand = !["U6-U7", "U8-U9"].includes(teamAgeBand);
  const variants = !isPositionalBand
    ? ["all", "outfield"]
    : player.primary_position === "goalkeeper"
      ? ["all", "goalkeeper"]
      : ["all", "outfield", player.primary_position];

  const { data: questions } = await supabase
    .from("team_questions")
    .select("*")
    .eq("team_id", session.team_id)
    .in("pillar_id", pillarIds)
    .in("variant", variants)
    .order("order_index");

  const { data: existingAssessments } = await supabase
    .from("assessments")
    .select("question_id, score")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  const { data: existingNotes } = await supabase
    .from("assessment_pillar_notes")
    .select("pillar_id, notes")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  return (
    <AssessmentForm
      session={session}
      pillarIds={pillarIds}
      players={ordered}
      currentIndex={currentIndex}
      questions={questions ?? []}
      existingScores={Object.fromEntries(
        (existingAssessments ?? []).map((a) => [a.question_id, a.score]),
      )}
      existingNotes={Object.fromEntries(
        (existingNotes ?? []).map((n) => [n.pillar_id, n.notes ?? ""]),
      )}
    />
  );
}
