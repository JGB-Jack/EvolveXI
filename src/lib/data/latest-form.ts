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
      player: firstOf(row.players),
    }))
    .filter(
      (row): row is LatestFormRow & { session_id: string } =>
        !!row.pillar_id && !!row.session_date,
    );

  const latestByPlayerPillar = new Map<string, { sessionId: string; date: string }>();
  for (const row of enriched) {
    const key = `${row.player_id}::${row.pillar_id}`;
    const current = latestByPlayerPillar.get(key);
    if (!current || row.session_date > current.date) {
      latestByPlayerPillar.set(key, { sessionId: row.session_id, date: row.session_date });
    }
  }

  return enriched.filter(
    (row) =>
      latestByPlayerPillar.get(`${row.player_id}::${row.pillar_id}`)?.sessionId ===
      row.session_id,
  );
}
