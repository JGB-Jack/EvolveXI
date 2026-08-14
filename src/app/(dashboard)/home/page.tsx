import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Star, Play } from "lucide-react";
import { SquadPillarChart } from "@/components/home/squad-pillar-chart";
import { getLatestFormRows } from "@/lib/data/latest-form";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string) ?? "coach";

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band")
    .eq("coach_id", user!.id)
    .single();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: squadCount },
    { data: inProgress },
    latestFormRows,
    { data: recentlyAssessed },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("team_id", team!.id)
      .eq("active", true),
    supabase
      .from("sessions")
      .select(
        "id, type, opponent, date, session_players(player_id, completed_at)",
      )
      .eq("team_id", team!.id)
      .is("completed_at", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Each player's ratings from their own most recent completed session -
    // a current-form snapshot rather than an all-time blend, since players
    // aren't all assessed on the same schedule.
    getLatestFormRows(supabase, team!.id),
    // Distinct players whose ratings were finished in the last 30 days.
    supabase
      .from("session_players")
      .select("player_id, sessions!inner(team_id)")
      .eq("sessions.team_id", team!.id)
      .not("completed_at", "is", null)
      .gte("completed_at", thirtyDaysAgo.toISOString()),
  ]);

  const assessmentRows = latestFormRows.filter(
    (row) => row.player?.active !== false,
  );

  const resumePlayerId = inProgress?.session_players.find(
    (sp: { player_id: string; completed_at: string | null }) => !sp.completed_at,
  )?.player_id;
  const resumeLabel = inProgress
    ? inProgress.opponent
      ? `${inProgress.type} vs ${inProgress.opponent}`
      : inProgress.type
    : null;

  let squadAverage: number | null = null;
  let pillarData: { pillar: string; score: number }[] = [];

  if (assessmentRows && assessmentRows.length > 0) {
    const totalsByPillar = new Map<string, { sum: number; count: number }>();
    let overallSum = 0;
    for (const row of assessmentRows) {
      overallSum += row.score;
      if (row.pillar_id) {
        const entry = totalsByPillar.get(row.pillar_id) ?? { sum: 0, count: 0 };
        entry.sum += row.score;
        entry.count += 1;
        totalsByPillar.set(row.pillar_id, entry);
      }
    }
    squadAverage = overallSum / assessmentRows.length;
    pillarData = Array.from(totalsByPillar.entries()).map(
      ([pillarId, { sum, count }]) => ({
        pillar: PILLAR_NAME[pillarId] ?? pillarId,
        score: sum / count,
      }),
    );
  }

  const assessedPlayerIds = new Set(
    (recentlyAssessed ?? []).map(
      (row: { player_id: string }) => row.player_id,
    ),
  );
  const assessedPercent =
    squadCount && squadCount > 0
      ? Math.round((assessedPlayerIds.size / squadCount) * 100)
      : 0;

  const weakestPillar = pillarData.reduce<{ pillar: string; score: number } | null>(
    (lowest, entry) => (!lowest || entry.score < lowest.score ? entry : lowest),
    null,
  );

  const everAssessedPlayerIds = new Set(assessmentRows.map((row) => row.player_id));
  const notYetAssessedCount = Math.max(
    (squadCount ?? 0) - everAssessedPlayerIds.size,
    0,
  );

  const STATS = [
    {
      label: "Players assessed in last month",
      value: `${assessedPercent}%`,
      icon: UserCheck,
      href: "/squad",
    },
    {
      label: "Squad average score",
      value: squadAverage !== null ? `${squadAverage.toFixed(1)}/5` : "-",
      icon: Star,
      href: "/sessions",
    },
    {
      label: "Focus area",
      value: weakestPillar
        ? `${weakestPillar.pillar} · ${weakestPillar.score.toFixed(1)}`
        : "-",
      icon: Star,
      href: "/rankings",
    },
    {
      label: "Players not yet assessed",
      value: `${notYetAssessedCount}`,
      icon: UserCheck,
      href: "/squad",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          {team?.name} &middot; {team?.age_band}
        </p>
      </div>

      <div className="space-y-4">
        {inProgress && resumePlayerId && (
          <Card className="border-l-4 border-l-primary py-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  In progress
                </div>
                <p className="font-medium">{resumeLabel}</p>
                <p className="text-sm text-muted-foreground">{inProgress.date}</p>
              </div>
              <Button
                render={
                  <Link href={`/sessions/${inProgress.id}/assess/${resumePlayerId}`} />
                }
              >
                <Play className="size-4" />
                Resume session
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          {STATS.map(({ label, value, href }) => (
            <Link key={label} href={href} className="block h-full">
              <Card className="h-full gap-2 border-b-2 border-b-primary py-4 transition-colors hover:bg-muted/50">
                <CardContent className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {label}
                  </div>
                  <span className="text-xl font-bold tabular-nums text-primary">
                    {value}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {pillarData.length > 0 && <SquadPillarChart data={pillarData} />}
      </div>
    </div>
  );
}
