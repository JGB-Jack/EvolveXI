"use client";

import { useRouter } from "next/navigation";
import {
  useSessionWizard,
  type SessionType,
} from "@/components/sessions/session-wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SESSION_TYPES: SessionType[] = ["Match", "Training", "Monthly Review"];

export default function SessionDetailsPage() {
  const router = useRouter();
  const { state, update } = useSessionWizard();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New Session</CardTitle>
          <CardDescription>
            Set the date, type, and any notes for this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={state.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Session type</Label>
            <Select
              value={state.type}
              onValueChange={(value) =>
                update({ type: (value ?? "Training") as SessionType })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.type === "Match" && (
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent (optional)</Label>
              <Input
                id="opponent"
                value={state.opponent}
                onChange={(e) => update({ opponent: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Session notes (optional)</Label>
            <Textarea
              id="notes"
              value={state.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => router.push("/sessions/new/pillars")}
          >
            Next: choose pillars
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
