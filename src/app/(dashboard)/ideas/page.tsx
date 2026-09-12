import { DrillGeneratorCard } from "@/components/ideas/drill-generator-card";
import { SessionBuilderCard } from "@/components/ideas/session-builder-card";

export default function IdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inspiration</h1>
        <p className="text-muted-foreground">
          AI tools to help you plan and coach on the day.
        </p>
      </div>
      <div className="space-y-4">
        <DrillGeneratorCard />
        <SessionBuilderCard />
      </div>
    </div>
  );
}
