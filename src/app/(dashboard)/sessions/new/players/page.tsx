import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlayerSelectionForm } from "@/components/sessions/player-selection-form";

export default async function SessionPlayersPage() {
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

  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name, primary_position")
    .eq("team_id", team.id)
    .eq("active", true)
    .order("last_name");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Select players</h1>
        <p className="text-muted-foreground">
          Choose who&apos;s in this session, or use Select all.
        </p>
      </div>
      <PlayerSelectionForm teamId={team.id} players={players ?? []} />
    </div>
  );
}
