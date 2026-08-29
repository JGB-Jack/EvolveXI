"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const AGE_BANDS = [
  "U6-U7",
  "U8-U9",
  "U10-U11",
  "U12-U13",
  "U14-U15",
  "U16-U17",
] as const;

// Wipes every player, session, assessment, and report for the coach's
// team, then renames it for a fresh squad. Players and sessions cascade
// (via foreign keys) to everything else that references them - session
// pillars/players, assessments, pillar notes, reports - so deleting just
// those two tables clears all of it. The question bank is also rebuilt
// from that age band's master questions (same as initial team setup),
// since wording/positional variants differ by age band and the old
// team_questions could be wrong for the new one.
export async function resetTeamForNewSquad(
  name: string,
  ageBand: string,
): Promise<{ error: string } | void> {
  name = name.trim();

  if (!name || !AGE_BANDS.includes(ageBand as (typeof AGE_BANDS)[number])) {
    return { error: "Team name and age band are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team, error: teamLookupError } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .single();
  if (teamLookupError || !team) {
    return { error: "Couldn't find your team." };
  }

  const { error: sessionsError } = await supabase
    .from("sessions")
    .delete()
    .eq("team_id", team.id);
  if (sessionsError) {
    return { error: sessionsError.message };
  }

  const { error: playersError } = await supabase
    .from("players")
    .delete()
    .eq("team_id", team.id);
  if (playersError) {
    return { error: playersError.message };
  }

  const { error: teamQuestionsDeleteError } = await supabase
    .from("team_questions")
    .delete()
    .eq("team_id", team.id);
  if (teamQuestionsDeleteError) {
    return { error: teamQuestionsDeleteError.message };
  }

  const { data: masterQuestions, error: mqError } = await supabase
    .from("master_questions")
    .select("*")
    .eq("age_band", ageBand);
  if (mqError) {
    return { error: mqError.message };
  }

  const newTeamQuestions = masterQuestions.map((q) => ({
    team_id: team.id,
    pillar_id: q.pillar_id,
    variant: q.variant,
    source_master_id: q.id,
    order_index: q.order_index,
    question_text: q.question_text,
    anchor_1: q.anchor_1,
    anchor_2: q.anchor_2,
    anchor_3: q.anchor_3,
    anchor_4: q.anchor_4,
    anchor_5: q.anchor_5,
    is_custom: false,
  }));

  const { error: tqInsertError } = await supabase
    .from("team_questions")
    .insert(newTeamQuestions);
  if (tqInsertError) {
    return { error: tqInsertError.message };
  }

  const { error: updateError } = await supabase
    .from("teams")
    .update({
      name,
      age_band: ageBand,
      latest_insight: null,
      latest_insight_generated_at: null,
    })
    .eq("id", team.id);
  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/home");
  revalidatePath("/squad");
  revalidatePath("/sessions");
  revalidatePath("/reports");
  revalidatePath("/rankings");
  revalidatePath("/settings");
  revalidatePath("/settings/questions");

  redirect("/home");
}
