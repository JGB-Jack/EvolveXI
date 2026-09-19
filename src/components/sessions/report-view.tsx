"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  generateReport,
  saveReportEdits,
  generateParentReport,
  saveParentReportEdits,
} from "@/lib/actions/reports";
import { completeSession } from "@/lib/actions/assessments";
import { refreshSquadInsight } from "@/lib/actions/squad-insight";
import type { ReportContent } from "@/lib/claude/report";
import type { ParentReportContent } from "@/lib/claude/parent-report";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Download, Sparkles, TrendingUp } from "lucide-react";
import { PlayerProgressChart } from "@/components/squad/player-progress-chart";
import { SeasonTrendChart } from "@/components/season-trend-chart";
import { cn, withTimeout } from "@/lib/utils";
import { PlayerAvatar } from "@/components/player-avatar";
import { generateAndOpenPdf } from "@/lib/pdf/generate-and-open";
import { ReportDocument } from "@/lib/pdf/report-document";
import { computeOverallFromPillarAverages } from "@/lib/pillar-scoring";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};
const PILLAR_ORDER = ["technical", "physical", "tactical", "psychological", "social"];

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  primary_position: string;
  squad_number: number | null;
};

export function ReportView({
  sessionId,
  sessionDate,
  clubLogoUrl,
  player,
  players,
  currentIndex,
  reportId: initialReportId,
  hasScores,
  isComplete,
  initialContent,
  initialParentContent,
  pillarAverages,
  currentDevelopment,
  pillarWeights,
  sessionOverall,
  previousSessionOverall,
  scoreHistory,
}: {
  sessionId: string;
  sessionDate: string;
  clubLogoUrl: string | null;
  player: Player;
  players: Player[];
  currentIndex: number;
  reportId: string | null;
  hasScores: boolean;
  isComplete: boolean;
  initialContent: ReportContent | null;
  initialParentContent: ParentReportContent | null;
  pillarAverages: Record<string, number>;
  currentDevelopment: { pillarId: string; score: number }[];
  pillarWeights: Record<string, number> | null;
  sessionOverall: number | null;
  previousSessionOverall: number | null;
  scoreHistory: { date: string; score: number }[];
}) {
  const router = useRouter();
  const isLast = currentIndex === players.length - 1;

  const developmentOverall = computeOverallFromPillarAverages(
    Object.fromEntries(currentDevelopment.map((p) => [p.pillarId, p.score])),
    pillarWeights,
  );

  const improved =
    sessionOverall !== null &&
    previousSessionOverall !== null &&
    sessionOverall > previousSessionOverall;

  const [content, setContent] = useState<ReportContent | null>(initialContent);
  const [reportId, setReportId] = useState<string | null>(initialReportId);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"coach" | "parent">("coach");
  const [parentContent, setParentContent] = useState<ParentReportContent | null>(
    initialParentContent,
  );
  const [generatingParent, setGeneratingParent] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Skipped on mount and right after a fresh generation, since that content
  // is already persisted by generateReport itself - only actual edits after
  // that point need autosaving.
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!content || !reportId) return;

    setSaveStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        await withTimeout(saveReportEdits(reportId, content), 15000);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("idle");
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    }, 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, reportId]);

  // Same pattern as the coach report's autosave above - skipped right after
  // a fresh generation, since generateParentReport already persisted that.
  const skipNextParentAutosave = useRef(true);

  useEffect(() => {
    if (skipNextParentAutosave.current) {
      skipNextParentAutosave.current = false;
      return;
    }
    if (!parentContent || !reportId) return;

    setSaveStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        await withTimeout(saveParentReportEdits(reportId, parentContent), 15000);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("idle");
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    }, 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentContent, reportId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateReport(sessionId, player.id);
      skipNextAutosave.current = true;
      setContent(result.content);
      setReportId(result.reportId);
      // The coach report just changed, so any previously generated parent
      // version (built from the old priorities) is stale - generateReport
      // already cleared it server-side, mirror that locally.
      setParentContent(null);
      setView("coach");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong writing the report.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateParent() {
    if (!reportId) return;
    setGeneratingParent(true);
    setParentError(null);
    try {
      const result = await generateParentReport(reportId);
      skipNextParentAutosave.current = true;
      setParentContent(result);
    } catch (err) {
      setParentError(
        err instanceof Error
          ? err.message
          : "Something went wrong writing the parent version.",
      );
    } finally {
      setGeneratingParent(false);
    }
  }

  function updateParentSummary(summary: string) {
    setParentContent((c) => (c ? { ...c, summary } : c));
  }

  function updateParentPillarNarrative(pillarId: string, narrative: string) {
    setParentContent((c) =>
      c
        ? {
            ...c,
            pillars: c.pillars.map((p) =>
              p.pillar_id === pillarId ? { ...p, narrative } : p,
            ),
          }
        : c,
    );
  }

  function updateParentStrength(index: number, value: string) {
    setParentContent((c) =>
      c
        ? {
            ...c,
            strengths: c.strengths.map((s, i) => (i === index ? value : s)),
          }
        : c,
    );
  }

  function updateParentPriority(
    index: number,
    field: "text" | "selfPractice",
    value: string,
  ) {
    setParentContent((c) =>
      c
        ? {
            ...c,
            priorities: c.priorities.map((p, i) =>
              i === index ? { ...p, [field]: value } : p,
            ),
          }
        : c,
    );
  }

  function updatePillarNarrative(pillarId: string, narrative: string) {
    setContent((c) =>
      c
        ? {
            ...c,
            pillars: c.pillars.map((p) =>
              p.pillar_id === pillarId ? { ...p, narrative } : p,
            ),
          }
        : c,
    );
  }

  function updateStrength(index: number, value: string) {
    setContent((c) =>
      c
        ? {
            ...c,
            strengths: c.strengths.map((s, i) => (i === index ? value : s)),
          }
        : c,
    );
  }

  function updatePriority(
    index: number,
    field: "text" | "practice",
    value: string,
  ) {
    setContent((c) =>
      c
        ? {
            ...c,
            priorities: c.priorities.map((p, i) =>
              i === index ? { ...p, [field]: value } : p,
            ),
          }
        : c,
    );
  }

  async function handleDownload() {
    const activeContent = view === "coach" ? content : parentContent;
    if (!activeContent) return;
    setDownloading(true);
    try {
      await generateAndOpenPdf(
        <ReportDocument
          playerName={`${player.first_name} ${player.last_name}`}
          position={POSITION_LABEL[player.primary_position]}
          sessionDate={sessionDate}
          clubLogoUrl={clubLogoUrl}
          view={view}
          content={activeContent}
          pillarAverages={pillarAverages}
          currentDevelopment={currentDevelopment}
          scoreHistory={scoreHistory}
        />,
      );
    } catch {
      toast.error("Couldn't create the PDF - try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleNext() {
    setSaving(true);
    try {
      if (content && reportId) {
        await withTimeout(saveReportEdits(reportId, content), 15000);
        setSaveStatus("saved");
      }
      if (parentContent && reportId) {
        await withTimeout(saveParentReportEdits(reportId, parentContent), 15000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
      return;
    }

    if (isLast) {
      try {
        await completeSession(sessionId);
        // Not awaited on purpose - this is a separate request the browser
        // fires and forgets, so the AI call behind it can never hold up
        // navigating to the complete screen below.
        refreshSquadInsight(sessionId).catch(() => {});
        router.push(`/sessions/${sessionId}/complete`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to finish session");
        setSaving(false);
      }
    } else {
      router.push(`/sessions/${sessionId}/assess/${players[currentIndex + 1].id}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlayerAvatar squadNumber={player.squad_number} size="md" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {player.first_name} {player.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {POSITION_LABEL[player.primary_position]} &middot; Report
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {content && (
            <Button
              variant="outline"
              size="icon-lg"
              onClick={handleDownload}
              disabled={downloading || (view === "parent" && !parentContent)}
              aria-label="Download"
            >
              <Download className="size-5" />
            </Button>
          )}
          <div className="text-right text-sm text-muted-foreground">
            Player {currentIndex + 1} of {players.length}
          </div>
        </div>
      </div>

      {content && improved && sessionOverall !== null && previousSessionOverall !== null && (
        <div className="animate-celebrate flex items-center gap-2 rounded-lg border-b-2 border-b-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          <TrendingUp className="size-4 shrink-0" />
          Improved since last session &middot; {previousSessionOverall.toFixed(1)} &rarr;{" "}
          {sessionOverall.toFixed(1)}
        </div>
      )}

      {!content && !hasScores && (
        <Card className="border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle>No scores recorded yet</CardTitle>
            <CardDescription>
              {player.first_name} hasn&apos;t been rated in this session, so
              there&apos;s nothing for a report to be based on. Go back and
              rate {player.first_name} first.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!content && hasScores && !isComplete && (
        <Card className="border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle>Assessment not finished yet</CardTitle>
            <CardDescription>
              {player.first_name} hasn&apos;t been rated on every question
              yet. Go back and answer every question before generating a
              report.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!content && hasScores && isComplete && (
        <Card className="border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle>Generate this player&apos;s report</CardTitle>
            <CardDescription>
              Claude will write a summary, strengths, and development
              priorities based on {player.first_name}&apos;s ratings and
              notes from this session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 text-sm text-destructive">{error}</p>
            )}
            <Button onClick={handleGenerate} disabled={generating}>
              <Sparkles className="size-4" />
              {generating ? "Writing report..." : "Generate report"}
            </Button>
          </CardContent>
        </Card>
      )}

      {content && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("coach")}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              view === "coach"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            Coach
          </button>
          <button
            type="button"
            onClick={() => setView("parent")}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              view === "parent"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            Parent
          </button>
        </div>
      )}

      {content && view === "coach" && (
        <div key="coach" className="fade-in-strong space-y-6">
          <Card className="border-b-2 border-b-primary">
            <CardContent className="pt-4">
              <Textarea
                value={content.summary}
                onChange={(e) =>
                  setContent((c) => (c ? { ...c, summary: e.target.value } : c))
                }
                className="min-h-20"
              />
            </CardContent>
          </Card>

          {[...content.pillars]
            .sort(
              (a, b) =>
                PILLAR_ORDER.indexOf(a.pillar_id) -
                PILLAR_ORDER.indexOf(b.pillar_id),
            )
            .map((p) => (
            <Card key={p.pillar_id} className="border-b-2 border-b-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {PILLAR_NAME[p.pillar_id] ?? p.pillar_id}
                  <span className="text-sm font-normal text-muted-foreground">
                    {(pillarAverages[p.pillar_id] ?? 0).toFixed(1)}/5
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={p.narrative}
                  onChange={(e) =>
                    updatePillarNarrative(p.pillar_id, e.target.value)
                  }
                  className="min-h-16"
                />
              </CardContent>
            </Card>
          ))}

          <Card className="border-b-2 border-b-primary">
            <CardHeader>
              <CardTitle className="text-base">Key strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {content.strengths.map((s, i) => (
                <Textarea
                  key={i}
                  value={s}
                  onChange={(e) => updateStrength(i, e.target.value)}
                  className="min-h-12"
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-b-2 border-b-primary">
            <CardHeader>
              <CardTitle className="text-base">Development priorities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.priorities.map((p, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-sm font-bold text-foreground">
                    Priority {i + 1}
                  </Label>
                  <Textarea
                    value={p.text}
                    onChange={(e) => updatePriority(i, "text", e.target.value)}
                    className="min-h-12"
                  />
                  <Label className="text-sm font-bold text-foreground">
                    Practice suggestion
                  </Label>
                  <Textarea
                    value={p.practice}
                    onChange={(e) =>
                      updatePriority(i, "practice", e.target.value)
                    }
                    className="min-h-12"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-b-2 border-b-primary">
            <CardHeader>
              <CardTitle className="text-base">
                Recommended training focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content.trainingFocus}
                onChange={(e) =>
                  setContent((c) =>
                    c ? { ...c, trainingFocus: e.target.value } : c,
                  )
                }
                className="min-h-16"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {content && view === "parent" && !parentContent && (
        <Card key="parent-empty" className="fade-in-strong border-b-2 border-b-primary">
          <CardHeader>
            <CardTitle>Generate a parent-friendly version</CardTitle>
            <CardDescription>
              Same summary and strengths, but development priorities come
              with something {player.first_name} can practice alone, away
              from training and matches - no coach jargon or team drills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parentError && (
              <p className="mb-4 text-sm text-destructive">{parentError}</p>
            )}
            <Button onClick={handleGenerateParent} disabled={generatingParent}>
              <Sparkles className="size-4" />
              {generatingParent ? "Writing..." : "Generate parent version"}
            </Button>
          </CardContent>
        </Card>
      )}

      {content && view === "parent" && parentContent && (
        <div key="parent" className="fade-in-strong space-y-6">
          <Card className="border-b-2 border-b-primary">
            <CardContent className="pt-4">
              <Textarea
                value={parentContent.summary}
                onChange={(e) => updateParentSummary(e.target.value)}
                className="min-h-20"
              />
            </CardContent>
          </Card>

          {[...parentContent.pillars]
            .sort(
              (a, b) =>
                PILLAR_ORDER.indexOf(a.pillar_id) -
                PILLAR_ORDER.indexOf(b.pillar_id),
            )
            .map((p) => (
              <Card key={p.pillar_id} className="border-b-2 border-b-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {PILLAR_NAME[p.pillar_id] ?? p.pillar_id}
                    <span className="text-sm font-normal text-muted-foreground">
                      {(pillarAverages[p.pillar_id] ?? 0).toFixed(1)}/5
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={p.narrative}
                    onChange={(e) =>
                      updateParentPillarNarrative(p.pillar_id, e.target.value)
                    }
                    className="min-h-16"
                  />
                </CardContent>
              </Card>
            ))}

          <Card className="border-b-2 border-b-primary">
            <CardHeader>
              <CardTitle className="text-base">Key strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {parentContent.strengths.map((s, i) => (
                <Textarea
                  key={i}
                  value={s}
                  onChange={(e) => updateParentStrength(i, e.target.value)}
                  className="min-h-12"
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-b-2 border-b-primary">
            <CardHeader>
              <CardTitle className="text-base">Things to work on</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {parentContent.priorities.map((p, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-sm font-bold text-foreground">
                    Priority {i + 1}
                  </Label>
                  <Textarea
                    value={p.text}
                    onChange={(e) =>
                      updateParentPriority(i, "text", e.target.value)
                    }
                    className="min-h-12"
                  />
                  <Label className="text-sm font-bold text-foreground">
                    Practice on your own
                  </Label>
                  <Textarea
                    value={p.selfPractice}
                    onChange={(e) =>
                      updateParentPriority(i, "selfPractice", e.target.value)
                    }
                    className="min-h-12"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {content && (
        <>
          {currentDevelopment.length > 0 && (
            <Card className="border-b-2 border-b-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Current Development
                  <span
                    className={cn(
                      "text-lg font-semibold",
                      developmentOverall !== null ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {developmentOverall !== null
                      ? developmentOverall.toFixed(1)
                      : "-"}
                  </span>
                </CardTitle>
                <CardDescription>
                  {player.first_name}&apos;s most recent score for each
                  pillar, across all sessions. Diagram will update on
                  finishing session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlayerProgressChart
                  data={currentDevelopment.map(({ pillarId, score }) => ({
                    pillar: PILLAR_NAME[pillarId] ?? pillarId,
                    score,
                  }))}
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {currentDevelopment.map(({ pillarId, score }) => (
                    <span key={pillarId} className="text-muted-foreground">
                      {PILLAR_NAME[pillarId] ?? pillarId}{" "}
                      <span className="font-semibold text-primary">
                        {score.toFixed(1)}
                      </span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {scoreHistory.length > 0 && (
            <Card className="border-b-2 border-b-primary">
              <CardHeader>
                <CardTitle className="text-base">Season trend</CardTitle>
                <CardDescription>
                  {player.first_name}&apos;s overall score across every
                  completed session this season.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SeasonTrendChart
                  data={scoreHistory}
                  playerFirstName={player.first_name}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Button
            variant="ghost"
            render={
              <Link href={`/sessions/${sessionId}/assess/${player.id}`} />
            }
          >
            <ArrowLeft className="size-4" />
            Back to ratings
          </Button>
          <div className="flex items-center gap-3">
            {content && (
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved"
                    : ""}
              </span>
            )}
            <Button onClick={handleNext} disabled={!content || saving}>
              {saving ? "Saving..." : isLast ? "Finish session" : "Next player"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
