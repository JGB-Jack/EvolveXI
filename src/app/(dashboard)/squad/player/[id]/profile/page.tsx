import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getPlayerPillarAverages } from "@/lib/data/player-pillar-averages";
import { PlayerProgressChart } from "@/components/squad/player-progress-chart";
import { scoreColorClass } from "@/lib/score-color";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/player-avatar";

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();

  const pillarAverages = await getPlayerPillarAverages(
    supabase,
    player.team_id,
    id,
  );

  const chartData = pillarAverages.map(({ pillarId, score }) => ({
    pillar: PILLAR_NAME[pillarId] ?? pillarId,
    score,
  }));
  const overall =
    pillarAverages.length > 0
      ? pillarAverages.reduce((sum, p) => sum + p.score, 0) / pillarAverages.length
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/squad" />}
      >
        <ArrowLeft className="size-4" />
        Back to squad
      </Button>

      <div className="flex items-center gap-3">
        <PlayerAvatar squadNumber={player.squad_number} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {player.first_name} {player.last_name}
          </h1>
          <p className="text-muted-foreground">
            {POSITION_LABEL[player.primary_position]}
            {player.secondary_position &&
              ` / ${POSITION_LABEL[player.secondary_position]}`}
            {player.dob && ` · Born ${player.dob}`}
          </p>
        </div>
      </div>

      {pillarAverages.length === 0 ? (
        <Card className="border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle>Assessment history</CardTitle>
            <CardDescription>
              Session history and progress charts for {player.first_name}{" "}
              will appear here once you start running assessments.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Current Development
              <span className={cn("text-lg", scoreColorClass(overall))}>
                {overall !== null ? overall.toFixed(1) : "-"}
              </span>
            </CardTitle>
            <CardDescription>
              Each pillar shows {player.first_name}&apos;s most recent score
              for that pillar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerProgressChart data={chartData} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {pillarAverages.map(({ pillarId, score }) => (
                <span key={pillarId} className="text-muted-foreground">
                  {PILLAR_NAME[pillarId] ?? pillarId}{" "}
                  <span className={scoreColorClass(score)}>
                    {score.toFixed(1)}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
