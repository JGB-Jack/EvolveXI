"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archivePlayer } from "@/lib/actions/players";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  PlayerFormSheet,
  type EditablePlayer,
} from "@/components/squad/player-form-sheet";
import { Plus } from "lucide-react";

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

type SortKey = "name" | "position" | "squad_number";

export function SquadView({
  teamId,
  teamName,
  teamAgeBand,
  players,
}: {
  teamId: string;
  teamName: string;
  teamAgeBand: string;
  players: EditablePlayer[];
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<EditablePlayer | null>(
    null,
  );
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });

  const sorted = useMemo(() => {
    const copy = [...players];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "name") {
        cmp = `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
        );
      } else if (sort.key === "position") {
        cmp = a.primary_position.localeCompare(b.primary_position);
      } else {
        cmp = (a.squad_number ?? Infinity) - (b.squad_number ?? Infinity);
      }
      return cmp * sort.dir;
    });
    return copy;
  }, [players, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 },
    );
  }

  function openAdd() {
    setEditingPlayer(null);
    setSheetOpen(true);
  }

  function openEdit(player: EditablePlayer) {
    setEditingPlayer(player);
    setSheetOpen(true);
  }

  async function handleArchive(player: EditablePlayer) {
    try {
      await archivePlayer(player.id);
      toast.success(`${player.first_name} archived`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive");
    }
  }

  if (players.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your Squad</h1>
          <p className="text-white/70">
            {teamName} &middot; {teamAgeBand}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Add your players to get started.</CardTitle>
            <CardDescription>
              Once your squad is set up you can begin running assessment
              sessions.
            </CardDescription>
          </CardHeader>
        </Card>
        <Button size="lg" onClick={openAdd}>
          <Plus className="size-4" />
          Add player
        </Button>
        <PlayerFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          teamId={teamId}
          player={editingPlayer}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your Squad</h1>
          <p className="text-white/70">
            {teamName} &middot; {teamAgeBand}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAdd}>
            <Plus className="size-4" />
            Add player
          </Button>
          <Button render={<Link href="/sessions/new/details" />}>
            Start assessment
          </Button>
        </div>
      </div>

      {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
      <div className="space-y-3 sm:hidden">
        {sorted.map((player) => (
          <Card key={player.id}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <button
                  className="truncate font-medium underline-offset-2 hover:underline"
                  onClick={() =>
                    router.push(`/squad/player/${player.id}/profile`)
                  }
                >
                  {player.first_name} {player.last_name}
                </button>
                <p className="text-sm text-muted-foreground">
                  {POSITION_LABEL[player.primary_position]}
                  {player.secondary_position &&
                    ` / ${POSITION_LABEL[player.secondary_position]}`}
                  {player.squad_number && ` · #${player.squad_number}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(player)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleArchive(player)}
                >
                  Archive
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                Name
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("position")}
              >
                Position
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("squad_number")}
              >
                Squad #
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                  <button
                    className="font-medium underline-offset-2 hover:underline"
                    onClick={() =>
                      router.push(`/squad/player/${player.id}/profile`)
                    }
                  >
                    {player.first_name} {player.last_name}
                  </button>
                </TableCell>
                <TableCell>
                  {POSITION_LABEL[player.primary_position]}
                  {player.secondary_position &&
                    ` / ${POSITION_LABEL[player.secondary_position]}`}
                </TableCell>
                <TableCell>{player.squad_number ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(player)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchive(player)}
                  >
                    Archive
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PlayerFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        teamId={teamId}
        player={editingPlayer}
      />
    </div>
  );
}
