"use client";

import { useState } from "react";
import { toast } from "sonner";
import { savePillarWeights } from "@/lib/actions/pillar-weights";
import { withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const PILLAR_ORDER = ["technical", "physical", "tactical", "psychological", "social"];
const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};
const WEIGHT_LABEL: Record<number, string> = {
  1: "Normal",
  2: "Higher",
  3: "High",
  4: "Very high",
  5: "Top priority",
};
const EQUAL_WEIGHTS: Record<string, number> = {
  technical: 1,
  physical: 1,
  tactical: 1,
  psychological: 1,
  social: 1,
};

export function PillarWeightingCard({
  initialWeights,
}: {
  initialWeights: Record<string, number> | null;
}) {
  const [weights, setWeights] = useState<Record<string, number>>({
    ...EQUAL_WEIGHTS,
    ...initialWeights,
  });
  const [busy, setBusy] = useState(false);

  async function handleSave(next: Record<string, number>) {
    setBusy(true);
    try {
      const result = await withTimeout(savePillarWeights(next), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setWeights(next);
      toast.success("Pillar weighting saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-b-2 border-b-primary">
      <CardHeader>
        <CardTitle>Pillar weighting</CardTitle>
        <CardDescription>
          Give some pillars more influence than others on overall scores
          to match your club or coaching ethos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {PILLAR_ORDER.map((pillarId) => (
          <div key={pillarId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{PILLAR_NAME[pillarId]}</span>
              <span className="text-muted-foreground">
                {WEIGHT_LABEL[weights[pillarId]]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={weights[pillarId]}
              disabled={busy}
              onChange={(e) =>
                setWeights((prev) => ({
                  ...prev,
                  [pillarId]: Number(e.target.value),
                }))
              }
              className="w-full accent-primary"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => handleSave(weights)}>
            {busy ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => handleSave(EQUAL_WEIGHTS)}
          >
            Reset to equal weighting
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
