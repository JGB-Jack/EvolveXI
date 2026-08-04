import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string) ?? "coach";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          Your team setup, squad, and sessions will appear here once you&apos;ve
          completed onboarding.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Phase 1 checkpoint</CardTitle>
          <CardDescription>
            Auth and navigation are wired up. Team setup and the question
            bank arrive in Phase 2.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
