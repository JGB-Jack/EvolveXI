"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSessionWizard } from "@/components/sessions/session-wizard-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Target, Zap, Brain, Sparkles, Users, Check } from "lucide-react";

const PILLARS = [
  {
    id: "technical",
    name: "Technical",
    description: "Ball control, passing, shooting",
    icon: Target,
  },
  {
    id: "physical",
    name: "Physical",
    description: "Speed, stamina, strength, agility",
    icon: Zap,
  },
  {
    id: "tactical",
    name: "Tactical",
    description: "Positioning, decision-making, game understanding",
    icon: Brain,
  },
  {
    id: "psychological",
    name: "Psychological",
    description: "Composure, resilience, confidence",
    icon: Sparkles,
  },
  {
    id: "social",
    name: "Social",
    description: "Communication, teamwork, leadership",
    icon: Users,
  },
];

const QUESTIONS_PER_PILLAR = 4;
const MINUTES_PER_QUESTION = 0.25;

export default function SessionPillarsPage() {
  const router = useRouter();
  const { state, update } = useSessionWizard();
  const [error, setError] = useState<string | null>(null);

  function toggle(pillarId: string) {
    setError(null);
    const selected = state.pillarIds.includes(pillarId);
    update({
      pillarIds: selected
        ? state.pillarIds.filter((id) => id !== pillarId)
        : [...state.pillarIds, pillarId],
    });
  }

  function handleNext() {
    if (state.pillarIds.length === 0) {
      setError("Select at least one pillar.");
      return;
    }
    router.push("/sessions/new/players");
  }

  const questionCount = state.pillarIds.length * QUESTIONS_PER_PILLAR;
  const minutes = Math.max(1, Math.round(questionCount * MINUTES_PER_QUESTION));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          What do you want to assess today?
        </h1>
        <p className="text-muted-foreground">
          Select one or more pillars. You don&apos;t have to assess all five
          every session.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PILLARS.map((pillar) => {
          const selected = state.pillarIds.includes(pillar.id);
          const Icon = pillar.icon;
          return (
            <button
              key={pillar.id}
              type="button"
              onClick={() => toggle(pillar.id)}
              className={cn(
                "relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background",
              )}
            >
              {selected && (
                <Check className="absolute top-3 right-3 size-4 text-primary" />
              )}
              <Icon className="size-6 text-primary" />
              <div>
                <div className="font-medium">{pillar.name}</div>
                <div className="text-sm text-muted-foreground">
                  {pillar.description}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {QUESTIONS_PER_PILLAR} questions
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
        <span>
          {state.pillarIds.length} pillar
          {state.pillarIds.length === 1 ? "" : "s"} selected &middot;{" "}
          {questionCount} questions per player &middot; ~{minutes} min
          {minutes === 1 ? "" : "s"} per player
        </span>
        <Button onClick={handleNext}>Next: select players</Button>
      </div>
    </div>
  );
}
