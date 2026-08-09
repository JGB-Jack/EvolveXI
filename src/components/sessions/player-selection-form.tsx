"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionWizard } from "@/components/sessions/session-wizard-context";
import { createSession } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

export type SquadPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  primary_position: string;
};

export function PlayerSelectionForm({
  teamId,
  players,
}: {
  teamId: string;
  players: SquadPlayer[];
}) {
  const router = useRouter();
  const { state, update } = useSessionWizard();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Default to the full squad selected the first time this step is seen.
  useEffect(() => {
    if (state.playerIds.length === 0 && players.length > 0) {
      update({ playerIds: players.map((p) => p.id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  function toggle(playerId: string) {
    const selected = state.playerIds.includes(playerId);
    update({
      playerIds: selected
        ? state.playerIds.filter((id) => id !== playerId)
        : [...state.playerIds, playerId],
    });
  }

  async function handleBegin() {
    setError(null);
    if (state.playerIds.length === 0) {
      setError("Select at least one player.");
      return;
    }
    setSaving(true);
    const result = await createSession(teamId, {
      date: state.date,
      type: state.type,
      opponent: state.opponent,
      notes: state.notes,
      pillarIds: state.pillarIds,
      playerIds: state.playerIds,
    });
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
    // On success the action redirects server-side.
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-card">
        {players.map((player) => {
          const checked = state.playerIds.includes(player.id);
          return (
            <label
              key={player.id}
              className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(player.id)}
              />
              <span className="flex-1">
                {player.first_name} {player.last_name}
              </span>
              <span className="text-sm text-muted-foreground">
                {POSITION_LABEL[player.primary_position]}
              </span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">
          {state.playerIds.length} of {players.length} selected
        </Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/sessions/new/pillars")}
          >
            Back
          </Button>
          <Button onClick={handleBegin} disabled={saving}>
            {saving ? "Starting..." : "Begin session"}
          </Button>
        </div>
      </div>
    </div>
  );
}
