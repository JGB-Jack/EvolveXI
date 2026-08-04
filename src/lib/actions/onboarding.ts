"use server";

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

export async function createTeam(
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

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ coach_id: user.id, name, age_band: ageBand })
    .select("id")
    .single();

  if (teamError) {
    return { error: teamError.message };
  }

  const { data: masterQuestions, error: mqError } = await supabase
    .from("master_questions")
    .select("*")
    .eq("age_band", ageBand);

  if (mqError) {
    return { error: mqError.message };
  }

  const teamQuestions = masterQuestions.map((q) => ({
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

  const { error: tqError } = await supabase
    .from("team_questions")
    .insert(teamQuestions);

  if (tqError) {
    return { error: tqError.message };
  }

  redirect("/onboarding/questions");
}

export async function updateTeamQuestion(
  id: string,
  fields: {
    question_text: string;
    anchor_1: string;
    anchor_2: string;
    anchor_3: string;
    anchor_4: string;
    anchor_5: string;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_questions")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addCustomQuestion(
  teamId: string,
  pillarId: string,
  variant: string,
) {
  const supabase = await createClient();

  const { data: existing, error: countError } = await supabase
    .from("team_questions")
    .select("order_index")
    .eq("team_id", teamId)
    .eq("pillar_id", pillarId)
    .eq("variant", variant)
    .order("order_index", { ascending: false })
    .limit(1);

  if (countError) {
    throw new Error(countError.message);
  }

  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

  const { error } = await supabase.from("team_questions").insert({
    team_id: teamId,
    pillar_id: pillarId,
    variant,
    source_master_id: null,
    order_index: nextOrder,
    question_text: "New question",
    anchor_1: "Anchor for score 1",
    anchor_2: "Anchor for score 2",
    anchor_3: "Anchor for score 3",
    anchor_4: "Anchor for score 4",
    anchor_5: "Anchor for score 5",
    is_custom: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCustomQuestion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_questions")
    .delete()
    .eq("id", id)
    .eq("is_custom", true);

  if (error) {
    throw new Error(error.message);
  }
}
