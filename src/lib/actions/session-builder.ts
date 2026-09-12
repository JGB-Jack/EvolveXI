"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateSessionPlan,
  type SessionPlan,
  type SessionKit,
  type PitchSize,
} from "@/lib/claude/session-builder";

export type SessionBuilderFields = {
  playerCount: number;
  supportCoaches: number;
  minutesAvailable: number;
  pitchSize: PitchSize;
  kit: SessionKit;
  otherKit: string;
  focus: string;
};

export async function generateSessionPlanForCoach(
  fields: SessionBuilderFields,
): Promise<{ plan: SessionPlan } | { error: string }> {
  if (!fields.playerCount || fields.playerCount < 1) {
    return { error: "Enter how many players you have." };
  }
  if (!fields.minutesAvailable || fields.minutesAvailable < 1) {
    return { error: "Enter how much time you have." };
  }
  if (!fields.focus?.trim()) {
    return { error: "Select what you want to work on." };
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
    const plan = await generateSessionPlan({
      ageBand: team.age_band,
      playerCount: fields.playerCount,
      supportCoaches: fields.supportCoaches,
      minutesAvailable: fields.minutesAvailable,
      pitchSize: fields.pitchSize,
      kit: fields.kit,
      otherKit: fields.otherKit?.trim() ?? "",
      focus: fields.focus.trim(),
    });
    return { plan };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to build a session.",
    };
  }
}
