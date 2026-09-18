import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DrillGeneratorCard } from "@/components/ideas/drill-generator-card";
import { SessionBuilderCard } from "@/components/ideas/session-builder-card";

// Without this, Vercel's default serverless function timeout (10s on the
// free/Hobby plan) can kill the drill/session Server Actions before Sonnet
// 5 finishes generating - the client then just sees a hung request until
// its own withTimeout fires. 60s is the Hobby plan's max.
export const maxDuration = 60;

export default async function IdeasPage() {
  const {
    data: { user },
  } = await getCurrentUser();
  const supabase = await createClient();
  const { data: team } = user
    ? await supabase
        .from("teams")
        .select("club_logo_url")
        .eq("coach_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inspiration</h1>
        <p className="text-muted-foreground">
          AI tools to help you plan and coach on the day.
        </p>
      </div>
      <div className="space-y-4">
        <DrillGeneratorCard clubLogoUrl={team?.club_logo_url ?? null} />
        <SessionBuilderCard clubLogoUrl={team?.club_logo_url ?? null} />
      </div>
    </div>
  );
}
