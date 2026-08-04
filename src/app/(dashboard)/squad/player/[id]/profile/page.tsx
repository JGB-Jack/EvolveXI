import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/squad" />}
      >
        <ArrowLeft className="size-4" />
        Back to squad
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">
          {player.first_name} {player.last_name}
        </h1>
        <p className="text-muted-foreground">
          {POSITION_LABEL[player.primary_position]}
          {player.secondary_position &&
            ` / ${POSITION_LABEL[player.secondary_position]}`}
          {player.squad_number != null && ` · #${player.squad_number}`}
          {player.dob && ` · Born ${player.dob}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment history</CardTitle>
          <CardDescription>
            Session history and progress charts for {player.first_name} will
            appear here once you start running assessments.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
