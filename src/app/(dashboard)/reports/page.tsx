import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsList } from "@/components/reports/reports-list";

export default async function ReportsPage() {
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

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, session_id, player_id, created_at, sessions(date, type, opponent, team_id), players(first_name, last_name)",
    )
    .eq("sessions.team_id", team.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  type ReportRow = {
    id: string;
    session_id: string;
    player_id: string;
    created_at: string;
    sessions: { date: string; type: string; opponent: string | null } | null;
    players: { first_name: string; last_name: string } | null;
  };

  // Embedded filter on a to-many join returns the parent row with a null
  // child when it doesn't match, rather than excluding the row - filter here.
  const rows = ((reports as unknown as ReportRow[]) ?? []).filter(
    (r) => r.sessions !== null,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-white/70">
          All AI-generated player reports from your sessions.
        </p>
      </div>
      <ReportsList reports={rows} />
    </div>
  );
}
