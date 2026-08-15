import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Mirrors the variant-matching used on the assessment form: below U10-U11,
// positions aren't fixed (players rotate freely), so every player sees the
// shared "outfield" set; from U10-U11 up, variants are matched to the
// player's actual position (including a goalkeeper-specific Physical set).
export async function getExpectedQuestionCount(
  supabase: SupabaseClient,
  {
    teamId,
    ageBand,
    position,
    pillarIds,
  }: { teamId: string; ageBand: string; position: string; pillarIds: string[] },
): Promise<number> {
  const isPositionalBand = !["U6-U7", "U8-U9"].includes(ageBand);
  const variants = !isPositionalBand
    ? ["all", "outfield"]
    : position === "goalkeeper"
      ? ["all", "goalkeeper"]
      : ["all", "outfield", position];

  const { count } = await supabase
    .from("team_questions")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .in("pillar_id", pillarIds)
    .in("variant", variants);

  return count ?? 0;
}
