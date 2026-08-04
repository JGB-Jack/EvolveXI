import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SquadView } from "@/components/squad/squad-view";

export default async function SquadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("coach_id", user.id)
    .single();

  if (!team) redirect("/onboarding/team");

  const { data: players, error } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, dob, primary_position, secondary_position, squad_number",
    )
    .eq("team_id", team.id)
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <SquadView teamId={team.id} teamName={team.name} players={players ?? []} />
  );
}
