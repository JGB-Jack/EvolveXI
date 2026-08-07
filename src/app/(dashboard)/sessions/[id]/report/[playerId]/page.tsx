import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportView } from "@/components/sessions/report-view";
import type { ReportContent } from "@/lib/claude/report";

export default async function PlayerReportPage({
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
    .select("id, date, type, opponent")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select("player_id, players(id, first_name, last_name, primary_position)")
    .eq("session_id", sessionId);

  type PlayerRow = {
    id: string;
    first_name: string;
    last_name: string;
    primary_position: string;
  };

  const ordered = (sessionPlayers ?? [])
    .map((sp) => sp.players as unknown as PlayerRow)
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const currentIndex = ordered.findIndex((p) => p.id === playerId);
  const player = ordered[currentIndex];
  if (!player) notFound();

  const { data: existingReport } = await supabase
    .from("reports")
    .select("id, edited_text")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  const { data: assessments } = await supabase
    .from("assessments")
    .select("score, team_questions(pillar_id)")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  const scoresByPillar = new Map<string, number[]>();
  for (const a of (assessments as unknown as
    | { score: number; team_questions: { pillar_id: string } }[]
    | null) ?? []) {
    const pillarId = a.team_questions.pillar_id;
    if (!scoresByPillar.has(pillarId)) scoresByPillar.set(pillarId, []);
    scoresByPillar.get(pillarId)!.push(a.score);
  }
  const pillarAverages = Object.fromEntries(
    Array.from(scoresByPillar.entries()).map(([pillarId, scores]) => [
      pillarId,
      scores.reduce((sum, s) => sum + s, 0) / scores.length,
    ]),
  );

  let initialContent: ReportContent | null = null;
  if (existingReport) {
    try {
      initialContent = JSON.parse(existingReport.edited_text);
    } catch {
      initialContent = null;
    }
  }

  return (
    <ReportView
      sessionId={session.id}
      player={player}
      players={ordered}
      currentIndex={currentIndex}
      reportId={existingReport?.id ?? null}
      initialContent={initialContent}
      pillarAverages={pillarAverages}
    />
  );
}
