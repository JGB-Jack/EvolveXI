"use client";

import { useState } from "react";
import { generateDrillForIssue } from "@/lib/actions/drill";
import type { DrillOutput } from "@/lib/claude/drill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Clock, Users } from "lucide-react";

const QUICK_ISSUES = [
  "Too many touches on the ball",
  "Players bunching around the ball",
  "Too many long balls",
  "Slow to press when we lose it",
];

export function DrillGeneratorCard() {
  const [issue, setIssue] = useState("");
  const [drill, setDrill] = useState<DrillOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    const result = await generateDrillForIssue(issue);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDrill(result.drill);
  }

  function handleTryAnother() {
    setDrill(null);
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setIssue("");
      setDrill(null);
      setError(null);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <Card className="border-b-2 border-b-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Fix a training or match issue
          </CardTitle>
          <CardDescription>
            Describe what you saw in training or at the weekend and get a
            drill to work on it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DialogTrigger render={<Button className="w-full" />}>
            Generate a drill
          </DialogTrigger>
        </CardContent>
      </Card>

      <DialogContent>
        {!drill ? (
          <>
            <DialogHeader>
              <DialogTitle>Fix a training or match issue</DialogTitle>
              <DialogDescription>
                What went wrong? Be as specific as you like.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={3}
              placeholder="e.g. players bunching around the ball instead of spreading out"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ISSUES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIssue(preset)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {preset}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? "Generating..." : "Generate drill"}
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{drill.name}</DialogTitle>
              <DialogDescription>{drill.target}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                {drill.duration}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                {drill.format}
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="mb-1 text-sm font-semibold text-muted-foreground">
                Setup
              </p>
              <p className="text-sm">{drill.setup}</p>
            </div>
            <div className="border-t pt-3">
              <p className="mb-1 text-sm font-semibold text-muted-foreground">
                Rule
              </p>
              <p className="text-sm">{drill.constraint}</p>
            </div>
            <div className="border-t pt-3">
              <p className="mb-1 text-sm font-semibold text-muted-foreground">
                Coaching point
              </p>
              <p className="text-sm">{drill.coachingPoint}</p>
            </div>
            <Button variant="outline" onClick={handleTryAnother} className="w-full">
              Try another issue
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
