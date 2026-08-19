import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestFormRows } from "@/lib/data/latest-form";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { ExportButton } from "@/components/rankings/export-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const PILLAR_ORDER = ["technical", "physical", "tactical", "psychological", "social"];
const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

type PlayerAgg = {
  playerId: string;
  name: string;
  position: string;
  pillarSums: Record<string, { sum: number; count: number }>;
};

export default async function RankingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .single();
  if (!team) redirect("/onboarding/team");

  const rows = await getLatestFormRows(supabase, team.id);

  const byPlayer = new Map<string, PlayerAgg>();
  for (const row of rows) {
    if (!row.player || row.player.active === false) continue;
    let agg = byPlayer.get(row.player_id);
    if (!agg) {
      agg = {
        playerId: row.player_id,
        name: `${row.player.first_name} ${row.player.last_name}`,
        position: row.player.primary_position,
        pillarSums: {},
      };
      byPlayer.set(row.player_id, agg);
    }
    const entry = agg.pillarSums[row.pillar_id] ?? { sum: 0, count: 0 };
    entry.sum += row.score;
    entry.count += 1;
    agg.pillarSums[row.pillar_id] = entry;
  }

  const aggregates = Array.from(byPlayer.values());
  const pillarsPresent = PILLAR_ORDER.filter((id) =>
    aggregates.some((p) => p.pillarSums[id]),
  );

  const players = aggregates.map((p) => {
    const pillarAverages = Object.fromEntries(
      pillarsPresent.map((id) => [
        id,
        p.pillarSums[id] ? p.pillarSums[id].sum / p.pillarSums[id].count : null,
      ]),
    );
    // Average of the pillar averages (equal weight per pillar), not a raw
    // score average - pillars can come from different sessions with
    // different question counts now that each is independently "latest".
    const pillarScores = Object.values(pillarAverages).filter(
      (v): v is number => v !== null,
    );
    const overall =
      pillarScores.reduce((sum, v) => sum + v, 0) / pillarScores.length;

    return {
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      overall,
      pillarAverages,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Rankings</h1>
          <p className="text-muted-foreground">
            Each pillar shows the player&apos;s most recent score for that
            pillar.
          </p>
        </div>
        <ExportButton />
      </div>

      {players.length === 0 ? (
        <Card className="border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle>No ratings yet</CardTitle>
            <CardDescription>
              Once you complete an assessment session, players will appear
              here ranked by their scores.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <RankingsTable
          players={players}
          pillars={pillarsPresent.map((id) => ({ id, name: PILLAR_NAME[id] }))}
        />
      )}
    </div>
  );
}
