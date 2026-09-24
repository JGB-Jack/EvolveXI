"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateSessionInput = {
  date: string;
  type: string;
  opponent: string;
  notes: string;
  pillarIds: string[];
  playerIds: string[];
  playerPositions: Record<string, string>;
};

const VALID_POSITIONS = ["defence", "midfield", "attack", "goalkeeper"];
const NON_POSITIONAL_AGE_BANDS = ["U6-U7", "U8-U9"];

export async function createSession(
  teamId: string,
  input: CreateSessionInput,
): Promise<{ error: string } | void> {
  if (input.pillarIds.length === 0) {
    return { error: "Select at least one pillar." };
  }
  if (input.playerIds.length === 0) {
    return { error: "Select at least one player." };
  }

  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("age_band")
    .eq("id", teamId)
    .single();
  const isPositionalBand = !NON_POSITIONAL_AGE_BANDS.includes(
    team?.age_band ?? "",
  );

  const { data: playerRows } = await supabase
    .from("players")
    .select("id, primary_position")
    .eq("team_id", teamId)
    .in("id", input.playerIds);
  const usualPosition = new Map(
    (playerRows ?? []).map((p) => [p.id as string, p.primary_position as string]),
  );

  const positionByPlayer = new Map<string, string>();
  for (const playerId of input.playerIds) {
    const chosen = input.playerPositions?.[playerId];
    const position =
      isPositionalBand && chosen ? chosen : usualPosition.get(playerId);
    if (!position || !VALID_POSITIONS.includes(position)) {
      return { error: "One of the selected players has an invalid position." };
    }
    positionByPlayer.set(playerId, position);
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      team_id: teamId,
      date: input.date,
      type: input.type,
      opponent: input.type === "Match" ? input.opponent || null : null,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (sessionError) {
    return { error: sessionError.message };
  }

  const { error: pillarsError } = await supabase
    .from("session_pillars")
    .insert(
      input.pillarIds.map((pillarId) => ({
        session_id: session.id,
        pillar_id: pillarId,
      })),
    );

  if (pillarsError) {
    return { error: pillarsError.message };
  }

  const { error: playersError } = await supabase
    .from("session_players")
    .insert(
      input.playerIds.map((playerId) => ({
        session_id: session.id,
        player_id: playerId,
        position_played: positionByPlayer.get(playerId),
      })),
    );

  if (playersError) {
    return { error: playersError.message };
  }

  redirect(`/sessions/${session.id}/assess/${input.playerIds[0]}`);
}

export async function archiveSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sessions");
}

export async function restoreSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ archived_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sessions");
}
