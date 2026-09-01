"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addPlayer, updatePlayer, type PlayerFields } from "@/lib/actions/players";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POSITIONS = [
  { value: "defence", label: "Defence" },
  { value: "midfield", label: "Midfield" },
  { value: "attack", label: "Attack" },
  { value: "goalkeeper", label: "Goalkeeper" },
];

export type EditablePlayer = {
  id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  gender: string | null;
  primary_position: string;
  secondary_position: string | null;
  squad_number: number | null;
};

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  dob: "",
  gender: "",
  primary_position: "",
  secondary_position: "none",
  squad_number: "",
};

export function PlayerFormSheet({
  open,
  onOpenChange,
  teamId,
  player,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  player?: EditablePlayer | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      if (player) {
        setForm({
          first_name: player.first_name,
          last_name: player.last_name,
          dob: player.dob ?? "",
          gender: player.gender ?? "",
          primary_position: player.primary_position,
          secondary_position: player.secondary_position ?? "none",
          squad_number: player.squad_number?.toString() ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, player]);

  function toFields(): PlayerFields {
    return {
      first_name: form.first_name,
      last_name: form.last_name,
      dob: form.dob || null,
      gender: form.gender,
      primary_position: form.primary_position,
      secondary_position:
        form.secondary_position === "none" ? null : form.secondary_position,
      squad_number: form.squad_number ? parseInt(form.squad_number, 10) : null,
    };
  }

  async function handleSave(andAddAnother: boolean) {
    setError(null);
    setSaving(true);

    const fields = toFields();
    const result = player
      ? await updatePlayer(player.id, fields)
      : await addPlayer(teamId, fields);

    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    toast.success(player ? "Player updated" : "Player added");
    router.refresh();

    if (andAddAnother) {
      setForm(EMPTY_FORM);
    } else {
      onOpenChange(false);
    }
  }

  const isEditing = !!player;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit player" : "Add player"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this player's details."
              : "Add a player to your squad."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, first_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, last_name: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth (optional)</Label>
            <Input
              id="dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: g.value }))}
                  className={cn(
                    "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                    form.gender === g.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Primary position</Label>
            <Select
              value={form.primary_position}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, primary_position: value ?? "" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Secondary position (optional)</Label>
            <Select
              value={form.secondary_position}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, secondary_position: value ?? "none" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="squad_number">Squad number (optional)</Label>
            <Input
              id="squad_number"
              type="number"
              min={0}
              value={form.squad_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, squad_number: e.target.value }))
              }
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter>
          {isEditing ? (
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          ) : (
            <>
              <Button onClick={() => handleSave(false)} disabled={saving}>
                {saving ? "Saving..." : "Save and close"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                Save and add another
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
