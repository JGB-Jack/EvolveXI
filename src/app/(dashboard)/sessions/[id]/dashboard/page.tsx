import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionDashboard } from "@/components/sessions/session-dashboard";

export default async function SessionDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, date, type, opponent")
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
    .select("player_id, players(id, first_name, last_name, primary_position)")
    .eq("session_id", sessionId);

  type PlayerRow = { id: string; first_name: string; last_name: string; primary_position: string };
  const players = (sessionPlayers ?? [])
    .map((sp) => sp.players as unknown as PlayerRow)
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const { data: assessments } = await supabase
    .from("assessments")
    .select("player_id, score, team_questions(pillar_id)")
    .eq("session_id", sessionId);

  type AssessmentRow = { player_id: string; score: number; team_questions: { pillar_id: string } };
  const rows = (assessments as unknown as AssessmentRow[] | null) ?? [];

  const scoresByPlayerPillar = new Map<string, Map<string, number[]>>();
  for (const row of rows) {
    if (!scoresByPlayerPillar.has(row.player_id)) {
      scoresByPlayerPillar.set(row.player_id, new Map());
    }
    const pillarMap = scoresByPlayerPillar.get(row.player_id)!;
    const pillarId = row.team_questions.pillar_id;
    if (!pillarMap.has(pillarId)) pillarMap.set(pillarId, []);
    pillarMap.get(pillarId)!.push(row.score);
  }

  const playerScores = players.map((player) => {
    const pillarMap = scoresByPlayerPillar.get(player.id) ?? new Map<string, number[]>();
    const pillarAverages: Record<string, number | null> = {};
    const allScores: number[] = [];
    for (const pillarId of pillarIds) {
      const scores = pillarMap.get(pillarId) ?? [];
      pillarAverages[pillarId] =
        scores.length > 0
          ? scores.reduce((s, v) => s + v, 0) / scores.length
          : null;
      allScores.push(...scores);
    }
    const overall =
      allScores.length > 0
        ? allScores.reduce((s, v) => s + v, 0) / allScores.length
        : null;
    return { player, pillarAverages, overall };
  });

  return (
    <SessionDashboard
      session={session}
      pillarIds={pillarIds}
      playerScores={playerScores}
    />
  );
}
