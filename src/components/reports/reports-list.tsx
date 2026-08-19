"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteReport } from "@/lib/actions/reports";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

type Report = {
  id: string;
  session_id: string;
  player_id: string;
  created_at: string;
  sessions: { date: string; type: string; opponent: string | null } | null;
  players: { first_name: string; last_name: string } | null;
};

const RECENT_WINDOW_DAYS = 60;

export function ReportsList({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // A player can have several reports across sessions - flag whichever one
  // is each player's most recent so it's unambiguous regardless of search
  // filtering or where the row falls in the (globally date-sorted) list.
  const latestReportIds = useMemo(() => {
    const latestByPlayer = new Map<string, { id: string; createdAt: string }>();
    for (const r of reports) {
      const current = latestByPlayer.get(r.player_id);
      if (!current || r.created_at > current.createdAt) {
        latestByPlayer.set(r.player_id, { id: r.id, createdAt: r.created_at });
      }
    }
    return new Set(Array.from(latestByPlayer.values()).map((v) => v.id));
  }, [reports]);

  // Searching looks across every report regardless of the session's age, so
  // a coach can always find an older one by name - the date window only
  // applies to browsing without a search query.
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RECENT_WINDOW_DAYS);
    return d.toISOString().slice(0, 10);
  }, []);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const playerName = `${r.players?.first_name} ${r.players?.last_name}`.toLowerCase();
      const opponent = r.sessions?.opponent?.toLowerCase() ?? "";
      return playerName.includes(q) || opponent.includes(q);
    });
  }, [reports, search]);

  const isSearching = search.trim().length > 0;
  const filtered = useMemo(() => {
    if (isSearching || showAll) return searched;
    return searched.filter((r) => (r.sessions?.date ?? "") >= cutoffDate);
  }, [searched, isSearching, showAll, cutoffDate]);

  const hiddenCount = isSearching
    ? 0
    : reports.filter((r) => (r.sessions?.date ?? "") < cutoffDate).length;

  async function handleDelete(report: Report) {
    setDeletingId(report.id);
    try {
      await deleteReport(report.id);
      toast.success("Report deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  }

  if (reports.length === 0) {
    return (
      <Card className="border-b-2 border-b-primary">
        <CardHeader>
          <CardTitle>No reports yet</CardTitle>
          <CardDescription>
            Generate a player&apos;s report during an assessment session to
            see it here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by player or opposition..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-background"
      />

      {!isSearching && hiddenCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <span>
            {showAll
              ? "Showing all reports"
              : `Showing reports from the last ${RECENT_WINDOW_DAYS} days`}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show recent only" : `Show all (${hiddenCount} older)`}
          </Button>
        </div>
      )}

      {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
      <div className="space-y-1.5 sm:hidden">
        {filtered.map((r) => (
          <Card key={r.id} className="border-b-2 border-b-primary">
            <CardContent className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {r.players?.first_name} {r.players?.last_name}
                  {latestReportIds.has(r.id) && (
                    <Badge className="shrink-0">Latest</Badge>
                  )}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate">
                    {r.sessions?.type}
                    {r.sessions?.opponent ? ` vs ${r.sessions.opponent}` : ""}
                    {" · "}
                    {r.sessions?.date}
                  </span>
                  <span className="shrink-0">
                    · Generated {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/sessions/${r.session_id}/report/${r.player_id}`} />
                  }
                >
                  View
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button size="icon-sm" variant="ghost" />}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {r.players?.first_name} {r.players?.last_name}&apos;s
                        report from {r.sessions?.date} will be permanently
                        deleted. Their ratings for this session aren&apos;t
                        affected, so a new report can be generated later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                      >
                        {deletingId === r.id ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden border-b-2 border-b-primary sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-1.5">
                    {r.players?.first_name} {r.players?.last_name}
                    {latestReportIds.has(r.id) && <Badge>Latest</Badge>}
                  </span>
                </TableCell>
                <TableCell>
                  {r.sessions?.type}
                  {r.sessions?.opponent ? ` vs ${r.sessions.opponent}` : ""}
                  {" · "}
                  {r.sessions?.date}
                </TableCell>
                <TableCell>
                  {new Date(r.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    render={
                      <Link href={`/sessions/${r.session_id}/report/${r.player_id}`} />
                    }
                  >
                    View
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button size="sm" variant="ghost" />}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {r.players?.first_name} {r.players?.last_name}
                          &apos;s report from {r.sessions?.date} will be
                          permanently deleted. Their ratings for this session
                          aren&apos;t affected, so a new report can be
                          generated later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
