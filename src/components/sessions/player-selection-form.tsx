"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionWizard } from "@/components/sessions/session-wizard-context";
import { createSession } from "@/lib/actions/sessions";
import { withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "@/components/player-avatar";

const NON_POSITIONAL_AGE_BANDS = ["U6-U7", "U8-U9"];

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
  squad_number: number | null;
};

export function PlayerSelectionForm({
  teamId,
  ageBand,
  players,
}: {
  teamId: string;
  ageBand: string;
  players: SquadPlayer[];
}) {
  const router = useRouter();
  const { state, update } = useSessionWizard();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const showPositionPicker = !NON_POSITIONAL_AGE_BANDS.includes(ageBand);

  function setPosition(playerId: string, position: string) {
    update({
      playerPositions: { ...state.playerPositions, [playerId]: position },
    });
  }

  function selectAll() {
    update({ playerIds: players.map((p) => p.id) });
  }

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
    try {
      // A dropped connection mid-request would otherwise leave this
      // awaiting forever, leaving "Begin session" stuck with no way out.
      const result = await withTimeout(
        createSession(teamId, {
          date: state.date,
          type: state.type,
          opponent: state.opponent,
          notes: state.notes,
          pillarIds: state.pillarIds,
          playerIds: state.playerIds,
          playerPositions: state.playerPositions,
        }),
        15000,
      );
      if (result?.error) {
        setError(result.error);
        setSaving(false);
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
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to start session.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">
          {state.playerIds.length} of {players.length} selected
        </Label>
        <Button variant="outline" size="sm" onClick={selectAll}>
          Select all
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border bg-card">
        {players.map((player) => {
          const checked = state.playerIds.includes(player.id);
          return (
            <div
              key={player.id}
              onClick={() => toggle(player.id)}
              className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox checked={checked} className="pointer-events-none" />
              <PlayerAvatar squadNumber={player.squad_number} />
              <span className="flex-1">
                {player.first_name} {player.last_name}
              </span>
              {checked && showPositionPicker ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={
                      state.playerPositions[player.id] ?? player.primary_position
                    }
                    onValueChange={(v) =>
                      setPosition(player.id, v ?? player.primary_position)
                    }
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue>
                        {
                          POSITION_LABEL[
                            state.playerPositions[player.id] ??
                              player.primary_position
                          ]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {POSITION_LABEL[player.primary_position]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
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
  );
}
