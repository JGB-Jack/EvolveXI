import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResetTeamDialog } from "@/components/settings/reset-team-dialog";
import { AboutCard } from "@/components/about-card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("name, age_band")
    .eq("coach_id", user.id)
    .single();
  if (!team) redirect("/onboarding/team");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your team&apos;s question bank. Team and account settings are
          coming soon.
        </p>
      </div>

      <AboutCard />

      <Link href="/settings/questions" className="block">
        <Card className="border-b-2 border-b-primary transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle>Question bank</CardTitle>
            <CardDescription>
              View, edit, or add custom questions for any pillar.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Profile set up</CardTitle>
            <CardDescription>
              Edit your name, personal details, and team info.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Club set up</CardTitle>
            <CardDescription>
              Add your club motif to appear on reports.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Pillar weighting</CardTitle>
            <CardDescription>
              Give some pillars more influence than others on overall
              scores to match your club or coaching ethos.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>
              Answers to common questions about using EvolveXI.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Export data</CardTitle>
            <CardDescription>
              Download all your players, sessions, and reports.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="border-b-2 border-b-destructive">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Wipe all players, sessions, reports, and questions to start
            fresh with a new squad, optionally at a different age band.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetTeamDialog
            currentName={team.name}
            currentAgeBand={team.age_band}
          />
        </CardContent>
      </Card>
    </div>
  );
}
