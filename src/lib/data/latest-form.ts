import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type LatestFormRow = {
  player_id: string;
  score: number;
  pillar_id: string;
  session_date: string;
  player:
    | { first_name: string; last_name: string; primary_position: string; active: boolean }
    | undefined;
};

function firstOf<T>(value: T[] | T | null | undefined): T | undefined {
  return ([] as T[]).concat(value ?? [])[0];
}

// Each player's latest rating PER PILLAR, not latest per session - a
// player might get their Tactical pillar assessed on Thursday and their
// Technical pillar assessed in a different session on Friday, and both
// of those should count as "current form" even though they come from
// different sessions.
export async function getLatestFormRows(
  supabase: SupabaseClient,
  teamId: string,
): Promise<LatestFormRow[]> {
  const { data } = await supabase
    .from("assessments")
    .select(
      "player_id, session_id, score, team_questions(pillar_id), players(first_name, last_name, primary_position, active), sessions!inner(team_id, date, completed_at)",
    )
    .eq("sessions.team_id", teamId)
    .not("sessions.completed_at", "is", null);

  const enriched = (data ?? [])
    .map((row) => ({
      player_id: row.player_id as string,
      session_id: row.session_id as string,
      score: row.score as number,
      pillar_id: firstOf(row.team_questions)?.pillar_id,
      session_date: firstOf(row.sessions)?.date,
      completed_at: firstOf(row.sessions)?.completed_at,
      player: firstOf(row.players),
    }))
    .filter(
      (row): row is LatestFormRow & { session_id: string; completed_at: string } =>
        !!row.pillar_id && !!row.session_date && !!row.completed_at,
    );

  // Coaches often enter the same match/training date for several sessions
  // (e.g. testing, or backfilling), so session_date alone isn't a reliable
  // tiebreaker - fall back to completed_at, a true timestamp, when dates match.
  const latestByPlayerPillar = new Map<
    string,
    { sessionId: string; date: string; completedAt: string }
  >();
  for (const row of enriched) {
    const key = `${row.player_id}::${row.pillar_id}`;
    const current = latestByPlayerPillar.get(key);
    const isNewer =
      !current ||
      row.session_date > current.date ||
      (row.session_date === current.date && row.completed_at > current.completedAt);
    if (isNewer) {
      latestByPlayerPillar.set(key, {
        sessionId: row.session_id,
        date: row.session_date,
        completedAt: row.completed_at,
      });
    }
  }

  return enriched.filter(
    (row) =>
      latestByPlayerPillar.get(`${row.player_id}::${row.pillar_id}`)?.sessionId ===
      row.session_id,
  );
}
