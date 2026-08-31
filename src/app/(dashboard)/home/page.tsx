import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { SquadPillarChart } from "@/components/home/squad-pillar-chart";
import { DrillGeneratorCard } from "@/components/home/drill-generator-card";
import { SquadInsightButton } from "@/components/home/squad-insight-button";
import { ProgressRing } from "@/components/home/progress-ring";
import { KpiBar } from "@/components/home/kpi-bar";
import { getLatestFormRows } from "@/lib/data/latest-form";
import { scoreBarColorClass } from "@/lib/score-color";

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
    .select("id, name, age_band, latest_insight, latest_insight_generated_at")
    .eq("coach_id", user!.id)
    .single();

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [{ count: squadCount }, { data: inProgressSessions }, latestFormRows] =
    await Promise.all([
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
        .order("date", { ascending: false }),
      // Each player's ratings from their own most recent completed session -
      // a current-form snapshot rather than an all-time blend, since players
      // aren't all assessed on the same schedule.
      getLatestFormRows(supabase, team!.id),
    ]);

  const assessmentRows = latestFormRows.filter(
    (row) => row.player?.active !== false,
  );

  // A coach can have more than one session left open at once (e.g. forgot
  // to finish one before starting another) - resume cards are shown for
  // all of them, not just the most recent.
  type ResumableSession = {
    session: NonNullable<typeof inProgressSessions>[number];
    resumePlayerId: string;
    label: string;
  };
  // Same target the Sessions page's own "Resume" button uses - the first
  // player in the session, regardless of whether they've individually
  // finished their rating. A session stays "in progress" until its own
  // completed_at is set, even if every player has already been rated.
  const resumableSessions: ResumableSession[] = (inProgressSessions ?? [])
    .map((session) => {
      const resumePlayerId = session.session_players[0]?.player_id;
      return {
        session,
        resumePlayerId,
        label: session.opponent
          ? `${session.type} vs ${session.opponent}`
          : session.type,
      };
    })
    .filter((s): s is ResumableSession => s.resumePlayerId !== undefined);

  let squadAverage: number | null = null;
  let pillarData: { pillar: string; score: number }[] = [];
  const playersByPillar: Record<
    string,
    { playerId: string; name: string; squadNumber: number | null; score: number }[]
  > = {};

  if (assessmentRows && assessmentRows.length > 0) {
    const totalsByPillar = new Map<string, { sum: number; count: number }>();
    // Each pillar has several questions, so a player has several rows per
    // pillar here - averaged per (pillar, player) below, otherwise the
    // "top"/"bottom" popup could show the same player twice from two of
    // their own question scores instead of two different players.
    const totalsByPillarPlayer = new Map<
      string,
      Map<
        string,
        { sum: number; count: number; name: string; squadNumber: number | null }
      >
    >();
    let overallSum = 0;
    for (const row of assessmentRows) {
      overallSum += row.score;
      if (row.pillar_id) {
        const entry = totalsByPillar.get(row.pillar_id) ?? { sum: 0, count: 0 };
        entry.sum += row.score;
        entry.count += 1;
        totalsByPillar.set(row.pillar_id, entry);

        if (row.player) {
          const playerTotals =
            totalsByPillarPlayer.get(row.pillar_id) ?? new Map();
          totalsByPillarPlayer.set(row.pillar_id, playerTotals);
          const playerEntry = playerTotals.get(row.player_id) ?? {
            sum: 0,
            count: 0,
            name: `${row.player.first_name} ${row.player.last_name}`,
            squadNumber: row.player.squad_number,
          };
          playerEntry.sum += row.score;
          playerEntry.count += 1;
          playerTotals.set(row.player_id, playerEntry);
        }
      }
    }
    squadAverage = overallSum / assessmentRows.length;
    pillarData = Array.from(totalsByPillar.entries())
      .map(([pillarId, { sum, count }]) => ({
        pillar: PILLAR_NAME[pillarId] ?? pillarId,
        score: sum / count,
      }))
      .sort((a, b) => b.score - a.score);

    for (const [pillarId, playerTotals] of totalsByPillarPlayer.entries()) {
      const pillarName = PILLAR_NAME[pillarId] ?? pillarId;
      playersByPillar[pillarName] = Array.from(playerTotals.entries())
        .map(([playerId, { sum, count, name, squadNumber }]) => ({
          playerId,
          name,
          squadNumber,
          score: sum / count,
        }))
        .sort((a, b) => b.score - a.score);
    }
  }

  // Both KPI rings below now share this same 60-day window, so they read
  // as true complements of each other (assessed + not-assessed = squad),
  // and "not yet assessed" stays a useful ongoing signal (who's gone
  // stale) instead of permanently reading 0 once everyone's been rated
  // once. Same completed-session data everything else on this page uses
  // (not a separate session_players-level query) - a player who's
  // individually marked done but whose session isn't closed out yet
  // shouldn't count as "assessed" here.
  const sixtyDaysAgoDate = sixtyDaysAgo.toISOString().slice(0, 10);
  const assessedPlayerIds = new Set(
    assessmentRows
      .filter((row) => row.session_date >= sixtyDaysAgoDate)
      .map((row) => row.player_id),
  );
  const assessedPercent =
    squadCount && squadCount > 0
      ? Math.round((assessedPlayerIds.size / squadCount) * 100)
      : 0;

  const weakestPillar = pillarData.reduce<{ pillar: string; score: number } | null>(
    (lowest, entry) => (!lowest || entry.score < lowest.score ? entry : lowest),
    null,
  );

  // A player showing up in assessedPlayerIds might only have one pillar
  // covered in the last 60 days - this tracks the stricter bar of having
  // ALL 5 pillars freshly rated, which is a better signal of a genuinely
  // up-to-date, well-rounded assessment than "assessed on at least one thing."
  const recentPillarsByPlayer = new Map<string, Set<string>>();
  for (const row of assessmentRows) {
    if (row.session_date < sixtyDaysAgoDate) continue;
    if (!recentPillarsByPlayer.has(row.player_id)) {
      recentPillarsByPlayer.set(row.player_id, new Set());
    }
    recentPillarsByPlayer.get(row.player_id)!.add(row.pillar_id);
  }
  const fullyAssessedCount = Array.from(recentPillarsByPlayer.values()).filter(
    (pillars) => Object.keys(PILLAR_NAME).every((id) => pillars.has(id)),
  ).length;
  const fullyAssessedPercent =
    squadCount && squadCount > 0
      ? Math.round((fullyAssessedCount / squadCount) * 100)
      : 0;

  // Same red/amber/green banding used everywhere else, expressed relative
  // to each tile's own scale (/5 scores used directly for the bars).
  const squadAverageBarColor = scoreBarColorClass(squadAverage);
  const focusAreaBarColor = scoreBarColorClass(weakestPillar?.score ?? null);

  // Sessions are ordered newest-first, so only the latest open one gets a
  // card here - a coach who's left several open at once shouldn't have the
  // home page cluttered with one per session.
  const latestOpenSession = resumableSessions[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          {team?.name} &middot; {team?.age_band}
        </p>
      </div>

      <div className="space-y-4">
        {latestOpenSession && (
          <Card
            className="fade-in-strong border-b-2 border-b-primary py-0"
            style={{ animationDelay: "0ms" }}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  Latest open session
                </div>
                <p className="font-medium">{latestOpenSession.label}</p>
                <p className="text-sm text-muted-foreground">
                  {latestOpenSession.session.date}
                </p>
              </div>
              <Button
                render={
                  <Link
                    href={`/sessions/${latestOpenSession.session.id}/assess/${latestOpenSession.resumePlayerId}`}
                  />
                }
              >
                <Play className="size-4" />
                Resume session
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/squad"
            className="fade-in-strong block h-full"
            style={{ animationDelay: "60ms" }}
          >
            <Card className="h-full gap-2 border-b-2 border-b-primary py-4 transition-colors hover:bg-muted/50">
              <CardContent className="flex items-start gap-3">
                <ProgressRing
                  percent={assessedPercent}
                  colorClass="text-green-600 dark:text-green-500"
                  trackColorClass="text-red-600 dark:text-red-500"
                />
                <div className="text-xs font-semibold text-muted-foreground">
                  Players assessed &mdash; last 60 days
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/squad"
            className="fade-in-strong block h-full"
            style={{ animationDelay: "120ms" }}
          >
            <Card className="h-full gap-2 border-b-2 border-b-primary py-4 transition-colors hover:bg-muted/50">
              <CardContent className="flex items-start gap-3">
                <ProgressRing
                  percent={fullyAssessedPercent}
                  colorClass="text-green-600 dark:text-green-500"
                  trackColorClass="text-red-600 dark:text-red-500"
                />
                <div className="text-xs font-semibold text-muted-foreground">
                  Players assessed in all 5 pillars &mdash; last 60 days
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card
            className="fade-in-strong h-full gap-2 border-b-2 border-b-primary py-4"
            style={{ animationDelay: "180ms" }}
          >
            <CardContent className="space-y-1.5">
              <div className="flex min-h-8 items-center justify-between gap-1">
                <div className="text-xs font-semibold text-muted-foreground">
                  Squad focus area
                </div>
                {team?.latest_insight && (
                  <SquadInsightButton
                    tip={team.latest_insight}
                    generatedAt={team.latest_insight_generated_at}
                  />
                )}
              </div>
              <Link href="/rankings" className="block transition-opacity hover:opacity-80">
                <span className="text-xs font-bold tabular-nums text-primary">
                  {weakestPillar
                    ? `${weakestPillar.pillar} · ${weakestPillar.score.toFixed(1)}`
                    : "-"}
                </span>
                <KpiBar
                  percent={weakestPillar ? (weakestPillar.score / 5) * 100 : 0}
                  colorClass={focusAreaBarColor}
                />
              </Link>
            </CardContent>
          </Card>

          <Link
            href="/sessions"
            className="fade-in-strong block h-full"
            style={{ animationDelay: "240ms" }}
          >
            <Card className="h-full gap-2 border-b-2 border-b-primary py-4 transition-colors hover:bg-muted/50">
              <CardContent className="space-y-1.5">
                <div className="flex min-h-8 items-center text-xs font-semibold text-muted-foreground">
                  Squad average score
                </div>
                <span className="text-xs font-bold tabular-nums text-primary">
                  {squadAverage !== null ? `${squadAverage.toFixed(1)}/5` : "-"}
                </span>
                <KpiBar
                  percent={squadAverage !== null ? (squadAverage / 5) * 100 : 0}
                  colorClass={squadAverageBarColor}
                />
              </CardContent>
            </Card>
          </Link>
        </div>

        {pillarData.length > 0 && (
          <div className="fade-in-strong" style={{ animationDelay: "300ms" }}>
            <SquadPillarChart data={pillarData} playersByPillar={playersByPillar} />
          </div>
        )}

        <div className="fade-in-strong" style={{ animationDelay: "360ms" }}>
          <DrillGeneratorCard />
        </div>
      </div>
    </div>
  );
}
