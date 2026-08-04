import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { QuestionEditor, type TeamQuestionRow } from "@/components/onboarding/question-editor";
import { AddQuestionButton } from "@/components/onboarding/add-question-button";

const PILLAR_ORDER = [
  { id: "technical", name: "Technical" },
  { id: "physical", name: "Physical" },
  { id: "tactical", name: "Tactical" },
  { id: "psychological", name: "Psychological" },
  { id: "social", name: "Social" },
];

const VARIANT_ORDER = ["outfield", "defence", "midfield", "attack", "goalkeeper", "all"];
const VARIANT_LABEL: Record<string, string> = {
  outfield: "Outfield",
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
  all: "All positions",
};

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

  const byPillar = new Map<string, TeamQuestionRow[]>();
  for (const q of questions ?? []) {
    if (!byPillar.has(q.pillar_id)) byPillar.set(q.pillar_id, []);
    byPillar.get(q.pillar_id)!.push(q);
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

      <Accordion defaultValue={PILLAR_ORDER.map((p) => p.id)}>
        {PILLAR_ORDER.map((pillar) => {
          const pillarQuestions = (byPillar.get(pillar.id) ?? []).sort(
            (a, b) =>
              VARIANT_ORDER.indexOf(a.variant) -
                VARIANT_ORDER.indexOf(b.variant) || a.order_index - b.order_index,
          );
          if (pillarQuestions.length === 0) return null;

          const variants = Array.from(
            new Set(pillarQuestions.map((q) => q.variant)),
          );
          const hasMultipleVariants = variants.length > 1;

          return (
            <AccordionItem key={pillar.id} value={pillar.id}>
              <AccordionTrigger>
                {pillar.name}{" "}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {pillarQuestions.length} questions
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6">
                  {variants.map((variant) => {
                    const variantQuestions = pillarQuestions.filter(
                      (q) => q.variant === variant,
                    );
                    return (
                      <div key={variant} className="space-y-3">
                        {hasMultipleVariants && (
                          <h3 className="text-sm font-semibold text-muted-foreground">
                            {VARIANT_LABEL[variant]}
                          </h3>
                        )}
                        {variantQuestions.map((q) => (
                          <QuestionEditor key={q.id} question={q} />
                        ))}
                        <AddQuestionButton
                          teamId={team.id}
                          pillarId={pillar.id}
                          variant={variant}
                        />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="flex justify-end">
        <Button render={<Link href="/squad" />} size="lg">
          Go to my squad
        </Button>
      </div>
    </div>
  );
}
