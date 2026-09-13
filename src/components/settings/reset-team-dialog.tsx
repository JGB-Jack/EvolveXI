"use client";

import { useState, type FormEvent } from "react";
import { resetTeamForNewSquad } from "@/lib/actions/team";
import { withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const AGE_BANDS = [
  "U6-U7",
  "U8-U9",
  "U10-U11",
  "U12-U13",
  "U14-U15",
  "U16-U17",
];

export function ResetTeamDialog({
  currentName,
  currentAgeBand,
}: {
  currentName: string;
  currentAgeBand: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [ageBand, setAgeBand] = useState(currentAgeBand);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !ageBand) {
      setError("Team name and age band are required.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm you understand this can't be undone.");
      return;
    }

    setLoading(true);
    try {
      // A dropped connection mid-request would otherwise leave this
      // awaiting forever, with no way to tell whether the reset actually
      // went through.
      const result = await withTimeout(resetTeamForNewSquad(name, ageBand), 15000);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
      // On success the action redirects server-side.
    } catch (err) {
      // A successful redirect from the server action surfaces here as a
      // thrown error carrying this special digest - it must be allowed to
      // propagate so Next.js can complete the navigation, not treated as a
      // failure.
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof err.digest === "string" &&
        err.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to reset the team.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Reset & start new squad
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset & start new squad</DialogTitle>
          <DialogDescription>
            This permanently deletes every player, session, assessment, and
            report for this team, and rebuilds your question bank for the
            new age band (any custom questions you&apos;ve added are also
            reset). This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-name">New team name</Label>
            <Input
              id="reset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-age-band">New age band</Label>
            <Select value={ageBand} onValueChange={(v) => setAgeBand(v ?? "")}>
              <SelectTrigger id="reset-age-band" className="w-full">
                <SelectValue placeholder="Select an age band" />
              </SelectTrigger>
              <SelectContent>
                {AGE_BANDS.map((band) => (
                  <SelectItem key={band} value={band}>
                    {band}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            onClick={() => setConfirmed((c) => !c)}
            className="flex cursor-pointer items-start gap-2"
          >
            <Checkbox
              checked={confirmed}
              className="pointer-events-none mt-0.5"
            />
            <span className="text-sm">
              I understand this permanently deletes all current players,
              sessions, reports, and questions.
            </span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={loading || !confirmed}
          >
            {loading ? "Resetting..." : "Delete everything & reset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
