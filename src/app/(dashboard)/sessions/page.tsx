import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
      "id, date, type, opponent, completed_at, session_pillars(pillar_id), session_players(player_id)",
    )
    .eq("team_id", team.id)
    .order("date", { ascending: false });

  const hasSessions = (sessions?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sessions</h1>
          <p className="text-white/70">
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
        <>
          {/* Card list: phones. Table: tablet/desktop, where the extra width fits. */}
          <div className="space-y-3 sm:hidden">
            {sessions!.map((session) => (
              <Card key={session.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {session.type}
                        {session.opponent ? ` vs ${session.opponent}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.date} &middot; {session.session_players.length}{" "}
                        player{session.session_players.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {session.completed_at ? (
                      <Badge variant="outline">Complete</Badge>
                    ) : (
                      <Badge>In progress</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {session.session_pillars.map((sp) => (
                      <Badge key={sp.pillar_id} variant="secondary">
                        {PILLAR_LABEL[sp.pillar_id]}
                      </Badge>
                    ))}
                  </div>
                  {session.completed_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      render={<Link href={`/sessions/${session.id}/dashboard`} />}
                    >
                      Dashboard
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      render={
                        <Link
                          href={`/sessions/${session.id}/assess/${session.session_players[0]?.player_id}`}
                        />
                      }
                    >
                      Resume
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pillars</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      {session.completed_at ? (
                        <Badge variant="outline">Complete</Badge>
                      ) : (
                        <Badge>In progress</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.completed_at ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          render={<Link href={`/sessions/${session.id}/dashboard`} />}
                        >
                          Dashboard
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          render={
                            <Link
                              href={`/sessions/${session.id}/assess/${session.session_players[0]?.player_id}`}
                            />
                          }
                        >
                          Resume
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
