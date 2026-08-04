"use client";

import { useState, type FormEvent } from "react";
import { createTeam } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function TeamSetupPage() {
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !ageBand) {
      setError("Please enter a team name and select an age band.");
      return;
    }

    setLoading(true);
    const result = await createTeam(name, ageBand);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success the action redirects server-side; nothing else to do here.
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tell us about your team</CardTitle>
          <CardDescription>
            We&apos;ll load the right assessment questions for your
            team&apos;s age group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ageBand">Age band</Label>
              <Select
                value={ageBand}
                onValueChange={(value) => setAgeBand(value ?? "")}
              >
                <SelectTrigger id="ageBand" className="w-full">
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
