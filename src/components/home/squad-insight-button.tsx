"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SquadInsightButton({
  tip,
  generatedAt,
}: {
  tip: string;
  generatedAt: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label="Coach's tip" />
        }
      >
        <Sparkles className="size-4 text-primary" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Coach&apos;s tip</DialogTitle>
          {generatedAt && (
            <DialogDescription>
              From your session on {new Date(generatedAt).toLocaleDateString()}
            </DialogDescription>
          )}
        </DialogHeader>
        <p className="text-sm">{tip}</p>
      </DialogContent>
    </Dialog>
  );
}
