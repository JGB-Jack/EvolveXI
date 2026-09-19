import { createClient } from "@/lib/supabase/server";
import { computeOverallFromRawScores } from "@/lib/pillar-scoring";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function firstOf<T>(value: T[] | T | null | undefined): T | undefined {
  return ([] as T[]).concat(value ?? [])[0];
}

// The player's overall average score from their most recent OTHER completed
// session (excluding the one currently being viewed) - used to show whether
// this session was an improvement, session-to-session, rather than blending
// across sessions like the "current development" chart does.
export async function getPreviousSessionOverall(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
  excludeSessionId: string,
  weights?: Record<string, number> | null,
): Promise<number | null> {
  const { data } = await supabase
    .from("assessments")
    .select(
      "session_id, score, team_questions(pillar_id), sessions!inner(team_id, date, completed_at)",
    )
    .eq("player_id", playerId)
    .eq("sessions.team_id", teamId)
    .not("sessions.completed_at", "is", null)
    .neq("session_id", excludeSessionId);

  const rows = (data ?? [])
    .map((row) => ({
      session_id: row.session_id as string,
      score: row.score as number,
      pillar_id: firstOf(row.team_questions)?.pillar_id,
      date: firstOf(row.sessions)?.date,
      completed_at: firstOf(row.sessions)?.completed_at,
    }))
    .filter(
      (row): row is typeof row & { date: string; completed_at: string } =>
        !!row.date && !!row.completed_at,
    );

  if (rows.length === 0) return null;

  let latestSessionId = rows[0].session_id;
  let latestDate = rows[0].date;
  let latestCompletedAt = rows[0].completed_at;
  for (const row of rows) {
    if (
      row.date > latestDate ||
      (row.date === latestDate && row.completed_at > latestCompletedAt)
    ) {
      latestSessionId = row.session_id;
      latestDate = row.date;
      latestCompletedAt = row.completed_at;
    }
  }

  const scoresByPillar: Record<string, number[]> = {};
  for (const row of rows) {
    if (row.session_id !== latestSessionId || !row.pillar_id) continue;
    (scoresByPillar[row.pillar_id] ??= []).push(row.score);
  }

  return computeOverallFromRawScores(scoresByPillar, weights).overall;
}
