"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveRating,
  savePillarNotes,
  saveStandoutMoment,
  markPlayerComplete,
  completeSession,
} from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ArrowLeft, X } from "lucide-react";

const PILLAR_ORDER = [
  { id: "technical", name: "Technical" },
  { id: "physical", name: "Physical" },
  { id: "tactical", name: "Tactical" },
  { id: "psychological", name: "Psychological" },
  { id: "social", name: "Social" },
];

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

type Question = {
  id: string;
  pillar_id: string;
  question_text: string;
  anchor_1: string;
  anchor_2: string;
  anchor_3: string;
  anchor_4: string;
  anchor_5: string;
  order_index: number;
};

type SessionPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  primary_position: string;
  standout_moment: string | null;
};

export function AssessmentForm({
  session,
  pillarIds,
  players,
  currentIndex,
  questions,
  existingScores,
  existingNotes,
}: {
  session: { id: string; date: string; type: string; opponent: string | null };
  pillarIds: string[];
  players: SessionPlayer[];
  currentIndex: number;
  questions: Question[];
  existingScores: Record<string, number>;
  existingNotes: Record<string, string>;
}) {
  const router = useRouter();
  const player = players[currentIndex];
  const isLast = currentIndex === players.length - 1;

  const [scores, setScores] = useState<Record<string, number>>(existingScores);
  const [notes, setNotes] = useState<Record<string, string>>(existingNotes);
  const [standoutMoment, setStandoutMoment] = useState(
    player.standout_moment ?? "",
  );
  const [unanswered, setUnanswered] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const questionsByPillar = new Map<string, Question[]>();
  for (const q of questions) {
    if (!questionsByPillar.has(q.pillar_id)) questionsByPillar.set(q.pillar_id, []);
    questionsByPillar.get(q.pillar_id)!.push(q);
  }
  const visiblePillars = PILLAR_ORDER.filter(
    (p) => pillarIds.includes(p.id) && questionsByPillar.has(p.id),
  );

  async function handleRate(questionId: string, score: number) {
    setScores((s) => ({ ...s, [questionId]: score }));
    setUnanswered((u) => {
      const next = new Set(u);
      next.delete(questionId);
      return next;
    });
    try {
      await saveRating(session.id, player.id, questionId, score);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rating");
    }
  }

  async function handleNotesBlur(pillarId: string) {
    try {
      await savePillarNotes(session.id, player.id, pillarId, notes[pillarId] ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notes");
    }
  }

  async function handleStandoutBlur() {
    try {
      await saveStandoutMoment(session.id, player.id, standoutMoment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleContinue() {
    const missing = questions.filter((q) => !(q.id in scores));
    if (missing.length > 0) {
      setUnanswered(new Set(missing.map((q) => q.id)));
      toast.warning(
        `${missing.length} question${missing.length === 1 ? "" : "s"} unanswered for this player.`,
      );
    }

    setSaving(true);
    try {
      await saveStandoutMoment(session.id, player.id, standoutMoment);
      await markPlayerComplete(session.id, player.id);

      if (isLast) {
        await completeSession(session.id);
        toast.success("Session complete!");
        router.push("/sessions?completed=1");
      } else {
        router.push(`/sessions/${session.id}/assess/${players[currentIndex + 1].id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to continue");
    } finally {
      setSaving(false);
    }
  }

  const sessionLabel = session.opponent
    ? `${session.type} vs ${session.opponent}`
    : session.type;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {player.first_name} {player.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {POSITION_LABEL[player.primary_position]} &middot; {sessionLabel}{" "}
            &middot; {session.date}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Player {currentIndex + 1} of {players.length}
        </div>
      </div>

      <Accordion defaultValue={visiblePillars.map((p) => p.id)}>
        {visiblePillars.map((pillar) => (
          <AccordionItem key={pillar.id} value={pillar.id}>
            <AccordionTrigger>{pillar.name}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                {questionsByPillar.get(pillar.id)!.map((q) => {
                  const selected = scores[q.id];
                  const isUnanswered = unanswered.has(q.id);
                  const anchors = [
                    q.anchor_1,
                    q.anchor_2,
                    q.anchor_3,
                    q.anchor_4,
                    q.anchor_5,
                  ];
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "space-y-2 rounded-lg p-2",
                        isUnanswered && "bg-amber-50 ring-1 ring-amber-400",
                      )}
                    >
                      <p className="font-medium">{q.question_text}</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleRate(q.id, score)}
                            className={cn(
                              "flex size-10 items-center justify-center rounded-full border-2 font-medium transition-colors",
                              selected === score
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-muted",
                            )}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      {selected && (
                        <p className="text-sm text-muted-foreground">
                          {anchors[selected - 1]}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Pillar notes (optional)
                  </Label>
                  <Textarea
                    placeholder="Any observations about this pillar for this player..."
                    value={notes[pillar.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [pillar.id]: e.target.value }))
                    }
                    onBlur={() => handleNotesBlur(pillar.id)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="space-y-2">
        <Label htmlFor="standout">Standout moment (optional)</Label>
        <Textarea
          id="standout"
          placeholder="e.g. Great pressing trigger in the 2nd half. Led the press three times..."
          value={standoutMoment}
          onChange={(e) => setStandoutMoment(e.target.value)}
          onBlur={handleStandoutBlur}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <Button
                variant="outline"
                render={
                  <Link
                    href={`/sessions/${session.id}/assess/${players[currentIndex - 1].id}`}
                  />
                }
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Button variant="ghost" render={<Link href="/sessions" />}>
              <X className="size-4" />
              Exit session
            </Button>
          </div>
          <Button onClick={handleContinue} disabled={saving}>
            {saving
              ? "Saving..."
              : isLast
                ? "Finish session"
                : "Save & next player"}
          </Button>
        </div>
      </div>
    </div>
  );
}
