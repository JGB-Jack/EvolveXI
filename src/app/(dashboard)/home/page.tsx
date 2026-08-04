import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string) ?? "coach";

  const { data: team } = await supabase
    .from("teams")
    .select("name, age_band")
    .eq("coach_id", user!.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          {team?.name} &middot; {team?.age_band}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Phase 2 checkpoint</CardTitle>
          <CardDescription>
            Team setup and the question bank are wired up. Squad management
            arrives in Phase 3.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
