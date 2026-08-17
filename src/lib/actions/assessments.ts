"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveRating(
  sessionId: string,
  playerId: string,
  questionId: string,
  score: number,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("assessments").upsert(
    {
      session_id: sessionId,
      player_id: playerId,
      question_id: questionId,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,player_id,question_id" },
  );
  if (error) throw new Error(error.message);
}

export async function savePillarNotes(
  sessionId: string,
  playerId: string,
  pillarId: string,
  notes: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("assessment_pillar_notes").upsert(
    {
      session_id: sessionId,
      player_id: playerId,
      pillar_id: pillarId,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,player_id,pillar_id" },
  );
  if (error) throw new Error(error.message);
}

export async function saveStandoutMoment(
  sessionId: string,
  playerId: string,
  standoutMoment: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .update({ standout_moment: standoutMoment })
    .eq("session_id", sessionId)
    .eq("player_id", playerId);
  if (error) throw new Error(error.message);
}

export async function markPlayerComplete(sessionId: string, playerId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .update({ completed_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("player_id", playerId);
  if (error) throw new Error(error.message);
}

export async function completeSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);

  // A session going from "in progress" to "completed" changes what
  // getLatestFormRows returns for every player in it, which feeds Home,
  // Rankings, Squad, and every report page for this session's players -
  // all of those need to pick up the newly-completed data, not a cached
  // snapshot from before this session counted.
  revalidatePath("/home");
  revalidatePath("/rankings");
  revalidatePath("/reports");
  revalidatePath("/squad");
  revalidatePath("/sessions/[id]/report/[playerId]", "page");
  revalidatePath("/squad/player/[id]/profile", "page");
}
