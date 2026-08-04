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

  const { data: session } = await supabase
    .from("sessions")
    .select("id, date, type, opponent, team_id")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { data: sessionPillars } = await supabase
    .from("session_pillars")
    .select("pillar_id")
    .eq("session_id", sessionId);
  const pillarIds = (sessionPillars ?? []).map((p) => p.pillar_id);

  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select("player_id, standout_moment, players(id, first_name, last_name, primary_position)")
    .eq("session_id", sessionId);

  type PlayerRow = {
    id: string;
    first_name: string;
    last_name: string;
    primary_position: string;
  };

  const ordered = (sessionPlayers ?? [])
    .map((sp) => {
      const p = sp.players as unknown as PlayerRow;
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        primary_position: p.primary_position,
        standout_moment: sp.standout_moment as string | null,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const currentIndex = ordered.findIndex((p) => p.id === playerId);
  const player = ordered[currentIndex];
  if (!player) notFound();

  const { data: questions } = await supabase
    .from("team_questions")
    .select("*")
    .eq("team_id", session.team_id)
    .in("pillar_id", pillarIds)
    .in("variant", ["all", "outfield", player.primary_position])
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
