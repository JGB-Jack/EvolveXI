"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { savePillarWeights } from "@/lib/actions/pillar-weights";
import { cn, withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const [expanded, setExpanded] = useState(false);

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
    <Card className="gap-0 overflow-hidden border-b-2 border-b-primary py-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="primary-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground">
              <SlidersHorizontal className="size-4" />
            </span>
            <p className="font-heading text-base leading-snug font-medium">
              Pillar weighting
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Give some pillars more influence than others on overall
            scores to match your club or coaching ethos.
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-200 ease-out",
          expanded ? "max-h-[720px]" : "max-h-0",
        )}
      >
        <div className="space-y-5 border-t px-4 pt-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Changing these weightings affects every score in the app,
            including past sessions and reports - not just new ones. For
            that reason, it&apos;s best to set your weighting at the start
            of the season and leave it in place, rather than adjusting it
            partway through.
          </p>
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
        </div>
      </div>
    </Card>
  );
}
