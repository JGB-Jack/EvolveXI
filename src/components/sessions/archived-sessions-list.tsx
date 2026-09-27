"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { restoreSession, deleteSessionPermanently } from "@/lib/actions/sessions";
import {
  playerNamesSummary,
  playerNamesFull,
  type SessionPlayerRow,
} from "@/lib/player-names";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type ArchivedSession = {
  id: string;
  date: string;
  type: string;
  opponent: string | null;
  session_players: SessionPlayerRow[];
};

export function ArchivedSessionsList({
  sessions,
}: {
  sessions: ArchivedSession[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRestore(id: string) {
    setBusyId(id);
    try {
      await restoreSession(id);
      toast.success("Session restored");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteSessionPermanently(id);
      toast.success("Session deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const label = `${session.type}${session.opponent ? ` vs ${session.opponent}` : ""} on ${session.date}`;
        return (
          <div
            key={session.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate">
                {session.type}
                {session.opponent ? ` vs ${session.opponent}` : ""}
                <span className="text-muted-foreground"> &middot; {session.date}</span>
              </p>
              <p
                className="truncate text-sm text-muted-foreground"
                title={playerNamesFull(session.session_players)}
              >
                {playerNamesSummary(session.session_players)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === session.id}
                onClick={() => handleRestore(session.id)}
              >
                Restore
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button size="sm" variant="outline" disabled={busyId === session.id} />
                  }
                >
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this session permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all ratings and any generated report for{" "}
                      {label}. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(session.id)}
                    >
                      Delete permanently
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
