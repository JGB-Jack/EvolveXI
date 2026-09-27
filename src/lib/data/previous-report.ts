import { createClient } from "@/lib/supabase/server";
import type { ReportContent } from "@/lib/claude/report";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type PreviousReportSummary = {
  summary: string;
  priorities: string[];
};

// The player's most recent OTHER completed session that has a saved report,
// so a new report can reference real continuity ("still developing X",
// "progress on Y") instead of being written from scratch every time. Uses
// the coach-edited text, not the original AI draft, since that's the
// version the coach actually kept - same reasoning the parent report
// already uses. Returns null for a player's first report, or if the coach
// has simply never generated one before - callers should treat that as
// "no prior context", not an error.
export async function getPreviousReport(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
  excludeSessionId: string,
): Promise<PreviousReportSummary | null> {
  const { data } = await supabase
    .from("reports")
    .select("edited_text, sessions!inner(team_id, date, completed_at)")
    .eq("player_id", playerId)
    .eq("sessions.team_id", teamId)
    .neq("session_id", excludeSessionId)
    .not("sessions.completed_at", "is", null)
    .order("date", { referencedTable: "sessions", ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  try {
    const content = JSON.parse(data.edited_text) as ReportContent;
    return {
      summary: content.summary,
      priorities: content.priorities.map((p) => p.text),
    };
  } catch {
    return null;
  }
}
