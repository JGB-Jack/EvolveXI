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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Welcome, {name}</h1>
        <p className="text-white/70">
          {team?.name} &middot; {team?.age_band}
        </p>
      </div>

      <div className="space-y-3">
        {inProgress && resumePlayerId && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">Latest open session</p>
                <p className="text-sm text-muted-foreground">
                  {resumeLabel} &middot; {inProgress.date}
                </p>
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

        {STATS.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-primary" />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-xl font-semibold">{value}</span>
              </CardContent>
            </Card>
          </Link>
        ))}

        {pillarData.length > 0 && <SquadPillarChart data={pillarData} />}
      </div>
    </div>
  );
}
