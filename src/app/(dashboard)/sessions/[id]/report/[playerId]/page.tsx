import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ReportView } from "@/components/sessions/report-view";
import { getExpectedQuestionCount } from "@/lib/data/session-questions";
import { getPlayerPillarAverages } from "@/lib/data/player-pillar-averages";
import { getPreviousSessionOverall } from "@/lib/data/previous-session-score";
import { getPlayerScoreHistory } from "@/lib/data/player-score-history";
import { computeOverallFromRawScores } from "@/lib/pillar-scoring";
import type { ReportContent } from "@/lib/claude/report";
import type { ParentReportContent } from "@/lib/claude/parent-report";

// Without this, Vercel's default serverless function timeout (10s on the
// free/Hobby plan) can kill the report-generation Server Actions before
// Claude finishes - the client then just sees a hung request until its own
// withTimeout fires. 60s is the Hobby plan's max.
export const maxDuration = 60;

export default async function PlayerReportPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id: sessionId, playerId } = await params;
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, date, type, opponent, team_id, teams(age_band, club_logo_url, pillar_weights)",
    )
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
  const team = session.teams as unknown as
    | {
        age_band: string;
        club_logo_url: string | null;
        pillar_weights: Record<string, number> | null;
      }
    | null;
  const teamAgeBand = team?.age_band ?? "";

  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select("player_id, players(id, first_name, last_name, primary_position, squad_number)")
    .eq("session_id", sessionId);

  type PlayerRow = {
    id: string;
    first_name: string;
    last_name: string;
    primary_position: string;
    squad_number: number | null;
  };

  const ordered = (sessionPlayers ?? [])
    .map((sp) => sp.players as unknown as PlayerRow)
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const currentIndex = ordered.findIndex((p) => p.id === playerId);
  const player = ordered[currentIndex];
  if (!player) notFound();

  const { data: existingReport } = await supabase
    .from("reports")
    .select("id, edited_text, parent_edited_text")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  const { data: assessments } = await supabase
    .from("assessments")
    .select("score, team_questions(pillar_id)")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  const { data: sessionPillars } = await supabase
    .from("session_pillars")
    .select("pillar_id")
    .eq("session_id", sessionId);
  const expectedQuestionCount = await getExpectedQuestionCount(supabase, {
    teamId: session.team_id,
    ageBand: teamAgeBand,
    position: player.primary_position,
    pillarIds: (sessionPillars ?? []).map((p) => p.pillar_id),
  });

  const scoresByPillar: Record<string, number[]> = {};
  for (const a of (assessments as unknown as
    | { score: number; team_questions: { pillar_id: string } }[]
    | null) ?? []) {
    const pillarId = a.team_questions.pillar_id;
    (scoresByPillar[pillarId] ??= []).push(a.score);
  }
  const { pillarAverages: rawPillarAverages, overall: sessionOverall } =
    computeOverallFromRawScores(scoresByPillar, team?.pillar_weights);
  // Downstream JSX expects every pillar present with a number, not
  // possibly null - this session's own pillars always have at least one
  // score by construction, so this narrowing is safe.
  const pillarAverages = rawPillarAverages as Record<string, number>;

  const currentDevelopment = await getPlayerPillarAverages(
    supabase,
    session.team_id,
    playerId,
  );
  const previousSessionOverall = await getPreviousSessionOverall(
    supabase,
    session.team_id,
    playerId,
    sessionId,
    team?.pillar_weights,
  );
  const scoreHistory = await getPlayerScoreHistory(
    supabase,
    session.team_id,
    playerId,
    team?.pillar_weights,
  );

  let initialContent: ReportContent | null = null;
  if (existingReport) {
    try {
      initialContent = JSON.parse(existingReport.edited_text);
    } catch {
      initialContent = null;
    }
  }

  let initialParentContent: ParentReportContent | null = null;
  if (existingReport?.parent_edited_text) {
    try {
      initialParentContent = JSON.parse(existingReport.parent_edited_text);
    } catch {
      initialParentContent = null;
    }
  }

  return (
    <ReportView
      sessionId={session.id}
      sessionDate={session.date}
      clubLogoUrl={team?.club_logo_url ?? null}
      player={player}
      players={ordered}
      currentIndex={currentIndex}
      reportId={existingReport?.id ?? null}
      hasScores={(assessments?.length ?? 0) > 0}
      isComplete={(assessments?.length ?? 0) >= expectedQuestionCount}
      initialContent={initialContent}
      initialParentContent={initialParentContent}
      pillarAverages={pillarAverages}
      currentDevelopment={currentDevelopment}
      pillarWeights={team?.pillar_weights ?? null}
      sessionOverall={sessionOverall}
      previousSessionOverall={previousSessionOverall}
      scoreHistory={scoreHistory}
    />
  );
}
