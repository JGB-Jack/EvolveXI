"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function savePillarWeights(
  weights: Record<string, number>,
): Promise<{ error: string } | { success: true }> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ pillar_weights: weights })
    .eq("coach_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
