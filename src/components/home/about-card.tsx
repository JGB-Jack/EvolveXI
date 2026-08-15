"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PILLARS = [
  { name: "Technical", description: "Ball control, passing, first touch" },
  { name: "Physical", description: "Pace, strength, stamina" },
  { name: "Tactical", description: "Decision-making, positioning" },
  { name: "Psychological", description: "Confidence, focus, resilience" },
  { name: "Social", description: "Teamwork, communication" },
];

export function AboutCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="primary-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground">
            <Info className="size-4" />
          </span>
          <p className="text-sm font-semibold">About EvolveXI</p>
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
          expanded ? "max-h-[520px]" : "max-h-0",
        )}
      >
        <div className="space-y-3 border-t px-4 pt-3 pb-4">
          <p className="text-sm text-muted-foreground">
            Watch, assess, and develop every player with one shared standard
            for &quot;good.&quot; Customise the questions and observations to
            fit your team, and let AI-assisted reports do the heavy lifting
            &mdash; complete with targeted drills for each player. See at a
            glance who&apos;s ready for selection, who needs extra reps, and
            where to focus training next.
          </p>
          <p className="text-sm text-muted-foreground">
            The 5 pillars are a widely-used framework in football coaching
            for developing well-rounded players:
          </p>
          <div className="space-y-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.name} className="flex items-baseline gap-2.5">
                <span className="size-1.5 shrink-0 -translate-y-0.5 rounded-full bg-primary" />
                <span className="w-24 shrink-0 text-sm font-semibold">
                  {pillar.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {pillar.description}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-primary">
            What are you waiting for? Get out there on the grass with
            EvolveXI!
          </p>
        </div>
      </div>
    </Card>
  );
}
