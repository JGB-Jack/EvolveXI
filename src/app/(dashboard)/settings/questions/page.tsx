import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuestionBankAccordion } from "@/components/questions/question-bank-accordion";

export default async function QuestionBankSettingsPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Question bank</h1>
        <p className="text-muted-foreground">
          {team.name} &middot; {team.age_band} &mdash; edit any question or
          anchor, or add your own. Changes apply to future sessions only.
        </p>
      </div>

      <QuestionBankAccordion teamId={team.id} questions={questions ?? []} />
    </div>
  );
}
