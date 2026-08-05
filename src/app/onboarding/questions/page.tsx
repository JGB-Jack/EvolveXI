import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { QuestionBankAccordion } from "@/components/questions/question-bank-accordion";

export default async function QuestionPreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band")
    .eq("coach_id", user.id)
    .single();

  if (!team) redirect("/onboarding/team");

  const { data: questions, error } = await supabase
    .from("team_questions")
    .select("*")
    .eq("team_id", team.id);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Your questions are ready</h1>
        <p className="text-muted-foreground">
          {team.name} &middot; {team.age_band} &mdash; review, edit, or add
          your own questions before heading to your squad.
        </p>
      </div>

      <QuestionBankAccordion
        teamId={team.id}
        questions={questions ?? []}
        defaultExpanded
      />

      <div className="flex justify-end">
        <Button render={<Link href="/squad" />} size="lg">
          Go to my squad
        </Button>
      </div>
    </div>
  );
}
