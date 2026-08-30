import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function firstOf<T>(value: T[] | T | null | undefined): T | undefined {
  return ([] as T[]).concat(value ?? [])[0];
}

export type ScoreHistoryPoint = {
  sessionId: string;
  date: string;
  score: number;
};

// Every completed session's overall average score for this player, oldest
// first - the full season trend, not just "latest" or "previous" like the
// other player-score helpers.
export async function getPlayerScoreHistory(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
): Promise<ScoreHistoryPoint[]> {
  const { data } = await supabase
    .from("assessments")
    .select("session_id, score, sessions!inner(team_id, date, completed_at)")
    .eq("player_id", playerId)
    .eq("sessions.team_id", teamId)
    .not("sessions.completed_at", "is", null);

  const bySession = new Map<string, { date: string; sum: number; count: number }>();
  for (const row of data ?? []) {
    const date = firstOf(row.sessions)?.date;
    if (!date) continue;
    const entry = bySession.get(row.session_id) ?? { date, sum: 0, count: 0 };
    entry.sum += row.score as number;
    entry.count += 1;
    bySession.set(row.session_id, entry);
  }

  return Array.from(bySession.entries())
    .map(([sessionId, { date, sum, count }]) => ({
      sessionId,
      date,
      score: sum / count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
