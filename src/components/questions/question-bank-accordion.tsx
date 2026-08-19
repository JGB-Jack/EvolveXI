import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
const VARIANT_COLOR: Record<string, string> = {
  outfield: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  defence: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  midfield: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  attack: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  goalkeeper:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  all: "bg-muted text-muted-foreground",
};

export function QuestionBankAccordion({
  teamId,
  questions,
  defaultExpanded = false,
}: {
  teamId: string;
  questions: TeamQuestionRow[];
  defaultExpanded?: boolean;
}) {
  const byPillar = new Map<string, TeamQuestionRow[]>();
  for (const q of questions) {
    if (!byPillar.has(q.pillar_id)) byPillar.set(q.pillar_id, []);
    byPillar.get(q.pillar_id)!.push(q);
  }

  return (
    <Card className="border-b-2 border-b-primary">
      <CardContent>
    <Accordion
      defaultValue={defaultExpanded ? PILLAR_ORDER.map((p) => p.id) : []}
    >
      {PILLAR_ORDER.map((pillar) => {
        const pillarQuestions = (byPillar.get(pillar.id) ?? []).sort(
          (a, b) =>
            VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant) ||
            a.order_index - b.order_index,
        );
        if (pillarQuestions.length === 0) return null;

        const variants = Array.from(new Set(pillarQuestions.map((q) => q.variant)));
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
                {hasMultipleVariants && (
                  <p className="text-sm text-muted-foreground">
                    These questions are grouped by <strong>player position</strong>,
                    not age — from U10&ndash;U11 up, each player is only shown the
                    questions for their own position during assessment.
                  </p>
                )}
                {variants.map((variant) => {
                  const variantQuestions = pillarQuestions.filter(
                    (q) => q.variant === variant,
                  );
                  return (
                    <div key={variant} className="space-y-3">
                      {hasMultipleVariants && (
                        <Badge
                          className={`h-auto px-3 py-1 text-sm font-semibold ${VARIANT_COLOR[variant]}`}
                        >
                          Position: {VARIANT_LABEL[variant]}
                        </Badge>
                      )}
                      {variantQuestions.map((q) => (
                        <QuestionEditor key={q.id} question={q} />
                      ))}
                      <AddQuestionButton
                        teamId={teamId}
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
      </CardContent>
    </Card>
  );
}
