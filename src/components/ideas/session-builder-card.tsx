"use client";

import { useState } from "react";
import {
  generateSessionPlanForCoach,
  type SessionBuilderFields,
} from "@/lib/actions/session-builder";
import type { SessionPlan, SessionKit, PitchSize } from "@/lib/claude/session-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb, Clock, Users } from "lucide-react";
import { cn, withTimeout } from "@/lib/utils";

const PITCH_SIZES: { value: PitchSize; label: string }[] = [
  { value: "quarter", label: "Quarter pitch" },
  { value: "half", label: "Half pitch" },
  { value: "full", label: "Full pitch" },
];

const FOCUS_OPTIONS = [
  "Passing",
  "Pressing",
  "Shooting",
  "Scanning",
  "Dribbling",
  "Other",
];

const KIT_ITEMS: { key: keyof SessionKit; label: string }[] = [
  { key: "cones", label: "Cones" },
  { key: "bibs", label: "Bibs" },
  { key: "balls", label: "Balls" },
  { key: "mannequins", label: "Mannequins" },
  { key: "poles", label: "Poles" },
  { key: "miniGoals", label: "Mini goals" },
  { key: "largeGoals", label: "Large goals" },
];

const EMPTY_KIT: SessionKit = {
  cones: false,
  bibs: false,
  balls: false,
  mannequins: false,
  poles: false,
  miniGoals: false,
  largeGoals: false,
};

export function SessionBuilderCard() {
  const [playerCount, setPlayerCount] = useState("");
  const [supportCoaches, setSupportCoaches] = useState("0");
  const [minutesAvailable, setMinutesAvailable] = useState("");
  const [pitchSize, setPitchSize] = useState<PitchSize | "">("");
  const [kit, setKit] = useState<SessionKit>(EMPTY_KIT);
  const [otherKitChecked, setOtherKitChecked] = useState(false);
  const [otherKitText, setOtherKitText] = useState("");
  const [focus, setFocus] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleKit(key: keyof SessionKit) {
    setKit((k) => ({ ...k, [key]: !k[key] }));
  }

  async function handleGenerate() {
    setError(null);

    if (!focus) {
      setError("Select what you want to work on.");
      return;
    }
    if (focus === "Other" && !customFocus.trim()) {
      setError("Enter what you want to work on.");
      return;
    }
    if (!pitchSize) {
      setError("Select how much space you have.");
      return;
    }
    if (!Object.values(kit).some(Boolean) && !otherKitChecked) {
      setError("Select at least one kit item you have available.");
      return;
    }
    if (otherKitChecked && !otherKitText.trim()) {
      setError("Enter what other kit you have.");
      return;
    }

    const fields: SessionBuilderFields = {
      playerCount: parseInt(playerCount, 10),
      supportCoaches: parseInt(supportCoaches, 10) || 0,
      minutesAvailable: parseInt(minutesAvailable, 10),
      pitchSize,
      kit,
      otherKit: otherKitChecked ? otherKitText.trim() : "",
      focus: focus === "Other" ? customFocus.trim() : focus,
    };

    setLoading(true);
    let result;
    try {
      // A dropped connection mid-request would otherwise leave this
      // awaiting forever - the AI call can legitimately take a while, so
      // this timeout is generous rather than the usual 15s for a plain save.
      result = await withTimeout(generateSessionPlanForCoach(fields), 45000);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to build a session.");
      return;
    }
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPlan(result.plan);
  }

  function handleTryAnother() {
    setPlan(null);
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setPlayerCount("");
      setSupportCoaches("0");
      setMinutesAvailable("");
      setPitchSize("");
      setKit(EMPTY_KIT);
      setOtherKitChecked(false);
      setOtherKitText("");
      setFocus("");
      setCustomFocus("");
      setPlan(null);
      setError(null);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <Card className="border-b-2 border-b-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-6 text-primary" />
            Rapid Session Builder
          </CardTitle>
          <CardDescription>
            Unprepared on training night? Get a rapid session plan to work with what you&apos;ve got.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DialogTrigger render={<Button className="w-full" />}>
            Build a session
          </DialogTrigger>
        </CardContent>
      </Card>

      <DialogContent>
        {!plan ? (
          <>
            <DialogHeader>
              <DialogTitle>Rapid Session Builder</DialogTitle>
              <DialogDescription>
                Tell us what you&apos;ve got to work with today.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="player-count">Players</Label>
                  <Input
                    id="player-count"
                    type="number"
                    min={1}
                    value={playerCount}
                    onChange={(e) => setPlayerCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-coaches">Support coaches</Label>
                  <Input
                    id="support-coaches"
                    type="number"
                    min={0}
                    value={supportCoaches}
                    onChange={(e) => setSupportCoaches(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minutes-available">Minutes available</Label>
                <Input
                  id="minutes-available"
                  type="number"
                  min={1}
                  value={minutesAvailable}
                  onChange={(e) => setMinutesAvailable(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Space available</Label>
                <Select
                  value={pitchSize}
                  onValueChange={(v) => setPitchSize((v as PitchSize) ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option">
                      {(value: PitchSize | null) =>
                        PITCH_SIZES.find((p) => p.value === value)?.label ?? "Select an option"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PITCH_SIZES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kit available</Label>
                <div className="grid grid-cols-2 gap-2">
                  {KIT_ITEMS.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => toggleKit(item.key)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <Checkbox checked={kit[item.key]} className="pointer-events-none" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                  <div
                    onClick={() => setOtherKitChecked((c) => !c)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <Checkbox checked={otherKitChecked} className="pointer-events-none" />
                    <span className="text-sm">Other</span>
                  </div>
                </div>
                {otherKitChecked && (
                  <Input
                    placeholder="e.g. hurdles, ladders"
                    value={otherKitText}
                    onChange={(e) => setOtherKitText(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>What do you want to work on?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFocus(option)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                        focus === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {focus === "Other" && (
                  <Input
                    placeholder="e.g. first touch"
                    value={customFocus}
                    onChange={(e) => setCustomFocus(e.target.value)}
                  />
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleGenerate} disabled={loading} className="w-full">
                {loading ? "Building..." : "Build session"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Your session</DialogTitle>
              <DialogDescription className="sr-only">
                A technical practice followed by a small-sided game.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                1. Technical practice
              </p>
              <p className="font-heading text-base font-medium">
                {plan.technicalPractice.name}
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  {plan.technicalPractice.duration}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  {plan.technicalPractice.format}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-muted-foreground">Setup</p>
                <p className="text-sm">{plan.technicalPractice.setup}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-muted-foreground">Rule</p>
                <p className="text-sm">{plan.technicalPractice.constraint}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-muted-foreground">
                  Coaching point
                </p>
                <p className="text-sm">{plan.technicalPractice.coachingPoint}</p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                2. Small-sided game
              </p>
              <p className="font-heading text-base font-medium">
                {plan.smallSidedGame.name}
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  {plan.smallSidedGame.duration}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  {plan.smallSidedGame.format}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-muted-foreground">Setup</p>
                <p className="text-sm">{plan.smallSidedGame.setup}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-muted-foreground">
                  Coaching point
                </p>
                <p className="text-sm">{plan.smallSidedGame.coachingPoint}</p>
              </div>
            </div>

            <Button variant="outline" onClick={handleTryAnother} className="w-full">
              Build another
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
