"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function saveClubLogoUrl(
  url: string,
): Promise<{ error: string } | { success: true }> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ club_logo_url: url })
    .eq("coach_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function removeClubLogo(): Promise<
  { error: string } | { success: true }
> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ club_logo_url: null })
    .eq("coach_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
