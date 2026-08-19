"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateReport, saveReportEdits } from "@/lib/actions/reports";
import { completeSession } from "@/lib/actions/assessments";
import type { ReportContent } from "@/lib/claude/report";
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
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { PlayerProgressChart } from "@/components/squad/player-progress-chart";
import { scoreColorClass } from "@/lib/score-color";
import { cn } from "@/lib/utils";

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
};

export function ReportView({
  sessionId,
  player,
  players,
  currentIndex,
  reportId: initialReportId,
  hasScores,
  isComplete,
  initialContent,
  pillarAverages,
  currentDevelopment,
}: {
  sessionId: string;
  player: Player;
  players: Player[];
  currentIndex: number;
  reportId: string | null;
  hasScores: boolean;
  isComplete: boolean;
  initialContent: ReportContent | null;
  pillarAverages: Record<string, number>;
  currentDevelopment: { pillarId: string; score: number }[];
}) {
  const router = useRouter();
  const isLast = currentIndex === players.length - 1;

  const developmentOverall =
    currentDevelopment.length > 0
      ? currentDevelopment.reduce((sum, p) => sum + p.score, 0) /
        currentDevelopment.length
      : null;

  const [content, setContent] = useState<ReportContent | null>(initialContent);
  const [reportId, setReportId] = useState<string | null>(initialReportId);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

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
        await saveReportEdits(reportId, content);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("idle");
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    }, 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, reportId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateReport(sessionId, player.id);
      skipNextAutosave.current = true;
      setContent(result.content);
      setReportId(result.reportId);
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

  async function handleNext() {
    setSaving(true);
    try {
      if (content && reportId) {
        await saveReportEdits(reportId, content);
        setSaveStatus("saved");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
      return;
    }

    if (isLast) {
      try {
        await completeSession(sessionId);
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
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {player.first_name} {player.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {POSITION_LABEL[player.primary_position]} &middot; Report
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {content && (
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => toast.info("Sending reports is coming soon")}
              aria-label="Send"
            >
              <Mail className="size-5" />
            </Button>
          )}
          <div className="text-right text-sm text-muted-foreground">
            Player {currentIndex + 1} of {players.length}
          </div>
        </div>
      </div>

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
        <>
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
                  <Label className="text-xs text-muted-foreground">
                    Priority {i + 1}
                  </Label>
                  <Textarea
                    value={p.text}
                    onChange={(e) => updatePriority(i, "text", e.target.value)}
                    className="min-h-12"
                  />
                  <Label className="text-xs text-muted-foreground">
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

          {currentDevelopment.length > 0 && (
            <Card className="border-b-2 border-b-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Current Development
                  <span className={cn("text-lg", scoreColorClass(developmentOverall))}>
                    {developmentOverall !== null
                      ? developmentOverall.toFixed(1)
                      : "-"}
                  </span>
                </CardTitle>
                <CardDescription>
                  {player.first_name}&apos;s most recent score for each
                  pillar, across all sessions.
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
                      <span className={scoreColorClass(score)}>
                        {score.toFixed(1)}
                      </span>
                    </span>
                  ))}
                </div>
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
