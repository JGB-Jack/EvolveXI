"use server";

import { createClient } from "@/lib/supabase/server";
import { generateDrill, type DrillOutput } from "@/lib/claude/drill";

export async function generateDrillForIssue(
  issue: string,
): Promise<{ drill: DrillOutput } | { error: string }> {
  const trimmed = issue.trim();
  if (!trimmed) {
    return { error: "Describe the issue you want a drill for." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You need to be signed in." };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("age_band")
    .eq("coach_id", user.id)
    .single();
  if (!team) {
    return { error: "Couldn't find your team." };
  }

  try {
    const drill = await generateDrill({ issue: trimmed, ageBand: team.age_band });
    return { drill };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to generate a drill.",
    };
  }
}
