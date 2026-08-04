import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
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
import { Plus } from "lucide-react";

const PILLAR_LABEL: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .single();

  if (!team) redirect("/onboarding/team");

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, date, type, opponent, session_pillars(pillar_id), session_players(player_id)",
    )
    .eq("team_id", team.id)
    .order("date", { ascending: false });

  const hasSessions = (sessions?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <p className="text-muted-foreground">
            Your assessment session history.
          </p>
        </div>
        <Button render={<Link href="/sessions/new/details" />}>
          <Plus className="size-4" />
          New session
        </Button>
      </div>

      {!hasSessions ? (
        <Card>
          <CardHeader>
            <CardTitle>No sessions yet</CardTitle>
            <CardDescription>
              Start your first assessment session to see it here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pillars</TableHead>
              <TableHead>Players</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions!.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{session.date}</TableCell>
                <TableCell>
                  {session.type}
                  {session.opponent ? ` vs ${session.opponent}` : ""}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {session.session_pillars.map((sp) => (
                      <Badge key={sp.pillar_id} variant="secondary">
                        {PILLAR_LABEL[sp.pillar_id]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{session.session_players.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
