"use client";

import { useState, type FormEvent } from "react";
import { resetTeamForNewSquad } from "@/lib/actions/team";
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
    const result = await resetTeamForNewSquad(name, ageBand);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success the action redirects server-side.
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
            <Label htmlFor="reset-name">Team name</Label>
            <Input
              id="reset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-age-band">Age band</Label>
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
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              className="mt-0.5"
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
