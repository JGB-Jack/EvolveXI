"use server";

import { createClient } from "@/lib/supabase/server";
import { generateSquadInsight, type SquadInsightPlayer } from "@/lib/claude/squad-insight";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

type AssessmentRow = {
  player_id: string;
  score: number;
  team_questions: {
    pillar_id: string;
    question_text: string;
    anchor_1: string;
    anchor_2: string;
    anchor_3: string;
    anchor_4: string;
    anchor_5: string;
  };
};

// Regenerates the team's squad-wide coaching tip from the session that was
// just completed - a pattern across multiple players, not a repeat of any
// one player's individual report. Best-effort: a failure here shouldn't
// block the session completion itself, so callers should catch and ignore.
export async function refreshSquadInsight(sessionId: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("date, type, team_id")
    .eq("id", sessionId)
    .single();
  if (!session) return;

  const { data: team } = await supabase
    .from("teams")
    .select("name, age_band")
    .eq("id", session.team_id)
    .single();
  if (!team) return;

  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select("player_id, players(first_name, last_name)")
    .eq("session_id", sessionId);

  const { data: assessments } = await supabase
    .from("assessments")
    .select(
      "player_id, score, team_questions(pillar_id, question_text, anchor_1, anchor_2, anchor_3, anchor_4, anchor_5)",
    )
    .eq("session_id", sessionId);

  const { data: pillarNotes } = await supabase
    .from("assessment_pillar_notes")
    .select("player_id, pillar_id, notes")
    .eq("session_id", sessionId);

  const notesByPlayerPillar = new Map<string, string>();
  for (const n of pillarNotes ?? []) {
    if (n.notes) notesByPlayerPillar.set(`${n.player_id}::${n.pillar_id}`, n.notes);
  }

  const players: SquadInsightPlayer[] = (sessionPlayers ?? []).map((sp) => {
    const player = sp.players as unknown as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const p = Array.isArray(player) ? player[0] : player;
    const playerName = p ? `${p.first_name} ${p.last_name}` : "Unknown player";

    const playerAssessments = (assessments as unknown as AssessmentRow[] | null ?? [])
      .filter((a) => a.player_id === sp.player_id);

    const pillarIds = Array.from(
      new Set(playerAssessments.map((a) => a.team_questions.pillar_id)),
    );

    return {
      playerName,
      pillars: pillarIds.map((pillarId) => ({
        pillarName: PILLAR_NAME[pillarId] ?? pillarId,
        notes: notesByPlayerPillar.get(`${sp.player_id}::${pillarId}`) ?? "",
        questions: playerAssessments
          .filter((a) => a.team_questions.pillar_id === pillarId)
          .map((a) => {
            const anchors = [
              a.team_questions.anchor_1,
              a.team_questions.anchor_2,
              a.team_questions.anchor_3,
              a.team_questions.anchor_4,
              a.team_questions.anchor_5,
            ];
            return {
              question_text: a.team_questions.question_text,
              anchor: anchors[a.score - 1],
              score: a.score,
            };
          }),
      })),
    };
  });

  if (players.length === 0 || players.every((p) => p.pillars.length === 0)) {
    console.warn(
      `Skipped squad insight for session ${sessionId}: no player/pillar data found.`,
    );
    return;
  }

  const tip = await generateSquadInsight({
    teamName: team.name,
    ageBand: team.age_band,
    sessionType: session.type,
    sessionDate: session.date,
    players,
  });

  const { error } = await supabase
    .from("teams")
    .update({ latest_insight: tip, latest_insight_generated_at: new Date().toISOString() })
    .eq("id", session.team_id);

  if (error) {
    console.error("Failed to save squad insight:", error.message);
    return;
  }

  console.log(`Squad insight saved for team ${session.team_id}: "${tip}"`);
}
