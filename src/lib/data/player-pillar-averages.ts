import { createClient } from "@/lib/supabase/server";
import { getLatestFormRows } from "@/lib/data/latest-form";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Each row from getLatestFormRows is one question's score, not a
// pre-averaged pillar score - a pillar with several questions has several
// rows, so they're averaged per pillar_id here before charting.
export async function getPlayerPillarAverages(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
): Promise<{ pillarId: string; score: number }[]> {
  const latestFormRows = await getLatestFormRows(supabase, teamId);
  const playerRows = latestFormRows.filter((row) => row.player_id === playerId);

  const pillarSums = new Map<string, { sum: number; count: number }>();
  for (const row of playerRows) {
    const entry = pillarSums.get(row.pillar_id) ?? { sum: 0, count: 0 };
    entry.sum += row.score;
    entry.count += 1;
    pillarSums.set(row.pillar_id, entry);
  }

  return Array.from(pillarSums.entries()).map(([pillarId, { sum, count }]) => ({
    pillarId,
    score: sum / count,
  }));
}
