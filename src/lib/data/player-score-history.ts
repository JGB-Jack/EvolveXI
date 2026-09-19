import { createClient } from "@/lib/supabase/server";
import { computeOverallFromPillarAverages } from "@/lib/pillar-scoring";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function firstOf<T>(value: T[] | T | null | undefined): T | undefined {
  return ([] as T[]).concat(value ?? [])[0];
}

export type ScoreHistoryPoint = {
  sessionId: string;
  date: string;
  score: number;
};

// Every completed session's overall score for this player, oldest first -
// the full season trend, not just "latest" or "previous" like the other
// player-score helpers. Grouped by pillar per session and combined through
// the shared scoring module (not a flat raw-score average) so this chart
// goes through the same weighted calculation as every other screen.
export async function getPlayerScoreHistory(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
  weights?: Record<string, number> | null,
): Promise<ScoreHistoryPoint[]> {
  const { data } = await supabase
    .from("assessments")
    .select(
      "session_id, score, team_questions(pillar_id), sessions!inner(team_id, date, completed_at)",
    )
    .eq("player_id", playerId)
    .eq("sessions.team_id", teamId)
    .not("sessions.completed_at", "is", null);

  const bySession = new Map<
    string,
    { date: string; scoresByPillar: Record<string, number[]> }
  >();
  for (const row of data ?? []) {
    const date = firstOf(row.sessions)?.date;
    const pillarId = firstOf(row.team_questions)?.pillar_id;
    if (!date || !pillarId) continue;
    const entry =
      bySession.get(row.session_id) ??
      { date, scoresByPillar: {} as Record<string, number[]> };
    (entry.scoresByPillar[pillarId] ??= []).push(row.score as number);
    bySession.set(row.session_id, entry);
  }

  return Array.from(bySession.entries())
    .map(([sessionId, { date, scoresByPillar }]) => {
      const pillarAverages = Object.fromEntries(
        Object.entries(scoresByPillar).map(([pillarId, scores]) => [
          pillarId,
          scores.reduce((sum, v) => sum + v, 0) / scores.length,
        ]),
      );
      return {
        sessionId,
        date,
        score: computeOverallFromPillarAverages(pillarAverages, weights) ?? 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
