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
        <h1 className="text-2xl font-semibold text-white">Select players</h1>
        <p className="text-white/70">
          All players are selected by default &mdash; deselect anyone
          absent or injured.
        </p>
      </div>
      <PlayerSelectionForm teamId={team.id} players={players ?? []} />
    </div>
  );
}
