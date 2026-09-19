import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, HelpCircle, AlertTriangle } from "lucide-react";
import { ResetTeamDialog } from "@/components/settings/reset-team-dialog";
import { ClubLogoCard } from "@/components/settings/club-logo-card";
import { ExportDataCard } from "@/components/settings/export-data-card";
import { PillarWeightingCard } from "@/components/settings/pillar-weighting-card";
import { AboutCard } from "@/components/about-card";

export default async function SettingsPage() {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band, club_logo_url, pillar_weights")
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
            <div className="flex items-center gap-2">
              <span className="primary-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground">
                <BookOpen className="size-4" />
              </span>
              <CardTitle>Question bank</CardTitle>
            </div>
            <CardDescription>
              View, edit, or add custom questions for any pillar.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="primary-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground">
                <User className="size-4" />
              </span>
              <CardTitle>Profile set up</CardTitle>
            </div>
            <CardDescription>
              Edit your name, personal details, and team info.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <ClubLogoCard teamId={team.id} initialLogoUrl={team.club_logo_url} />

      <PillarWeightingCard initialWeights={team.pillar_weights} />

      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="primary-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground">
                <HelpCircle className="size-4" />
              </span>
              <CardTitle>FAQs</CardTitle>
            </div>
            <CardDescription>
              Answers to common questions about using EvolveXI.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <ExportDataCard />

      <Card className="border-b-2 border-b-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive text-white">
              <AlertTriangle className="size-4" />
            </span>
            <CardTitle>Danger zone</CardTitle>
          </div>
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
