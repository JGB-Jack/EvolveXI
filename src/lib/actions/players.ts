"use server";

import { createClient } from "@/lib/supabase/server";

export type PlayerFields = {
  first_name: string;
  last_name: string;
  dob: string | null;
  primary_position: string;
  secondary_position: string | null;
  squad_number: number | null;
};

export async function addPlayer(
  teamId: string,
  fields: PlayerFields,
): Promise<{ error: string } | { id: string }> {
  if (!fields.first_name.trim() || !fields.last_name.trim()) {
    return { error: "First and last name are required." };
  }
  if (!fields.primary_position) {
    return { error: "Primary position is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ team_id: teamId, ...fields })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updatePlayer(
  id: string,
  fields: PlayerFields,
): Promise<{ error: string } | { ok: true }> {
  if (!fields.first_name.trim() || !fields.last_name.trim()) {
    return { error: "First and last name are required." };
  }
  if (!fields.primary_position) {
    return { error: "Primary position is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function archivePlayer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
