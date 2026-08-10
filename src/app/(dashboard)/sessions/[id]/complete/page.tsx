import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default async function SessionCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("date, type, opponent")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { count: playerCount } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const sessionLabel = session.opponent
    ? `${session.type} vs ${session.opponent}`
    : session.type;

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="size-12 text-green-600" />
          <CardTitle className="text-xl">Session complete</CardTitle>
          <CardDescription>
            {sessionLabel} &middot; {session.date} &middot; {playerCount ?? 0}{" "}
            player{playerCount === 1 ? "" : "s"} assessed.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="mt-6 flex flex-col gap-3">
        <Button size="lg" render={<Link href={`/sessions/${sessionId}/dashboard`} />}>
          View dashboard
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/home" />}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
