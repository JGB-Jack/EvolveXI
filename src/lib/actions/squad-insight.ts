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

const WINDOW_DAYS = 14;

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

// Regenerates the team's squad-wide coaching tip whenever a session is
// completed, pooling every completed session from the last 14 days (not
// just the one just finished) so there's enough data for a genuine
// cross-player pattern - a single small/one-player session on its own
// isn't enough to reliably show one. Best-effort: a failure here shouldn't
// block the session completion itself, so callers should catch and ignore.
export async function refreshSquadInsight(sessionId: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("team_id")
    .eq("id", sessionId)
    .single();
  if (!session) return;

  const { data: team } = await supabase
    .from("teams")
    .select("name, age_band")
    .eq("id", session.team_id)
    .single();
  if (!team) return;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);
  const windowStartDate = windowStart.toISOString().slice(0, 10);

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, date, type")
    .eq("team_id", session.team_id)
    .not("completed_at", "is", null)
    .gte("date", windowStartDate)
    .order("date", { ascending: true });

  const sessionIds = (recentSessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) {
    console.warn(
      `Skipped squad insight for team ${session.team_id}: no completed sessions in the last ${WINDOW_DAYS} days.`,
    );
    return;
  }
  const sessionDateById = new Map((recentSessions ?? []).map((s) => [s.id, s.date]));

  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select("player_id, players(first_name, last_name)")
    .in("session_id", sessionIds);

  const { data: assessments } = await supabase
    .from("assessments")
    .select(
      "player_id, session_id, score, team_questions(pillar_id, question_text, anchor_1, anchor_2, anchor_3, anchor_4, anchor_5)",
    )
    .in("session_id", sessionIds);

  const { data: pillarNotes } = await supabase
    .from("assessment_pillar_notes")
    .select("player_id, session_id, pillar_id, notes")
    .in("session_id", sessionIds);

  const notesByPlayerPillar = new Map<string, string[]>();
  for (const n of pillarNotes ?? []) {
    if (!n.notes) continue;
    const key = `${n.player_id}::${n.pillar_id}`;
    const date = sessionDateById.get(n.session_id) ?? "";
    const existing = notesByPlayerPillar.get(key) ?? [];
    existing.push(date ? `[${date}] ${n.notes}` : n.notes);
    notesByPlayerPillar.set(key, existing);
  }

  // Dedupe players across sessions - someone rated in 2 of the 3 recent
  // sessions should appear once, with data pooled from all of them.
  const uniquePlayers = new Map<string, { first_name: string; last_name: string }>();
  for (const sp of sessionPlayers ?? []) {
    const player = sp.players as unknown as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    const p = Array.isArray(player) ? player[0] : player;
    if (p && !uniquePlayers.has(sp.player_id)) {
      uniquePlayers.set(sp.player_id, p);
    }
  }

  const players: SquadInsightPlayer[] = Array.from(uniquePlayers.entries()).map(
    ([playerId, p]) => {
      const playerAssessments = (assessments as unknown as AssessmentRow[] | null ?? []).filter(
        (a) => a.player_id === playerId,
      );

      const pillarIds = Array.from(
        new Set(playerAssessments.map((a) => a.team_questions.pillar_id)),
      );

      return {
        playerName: `${p.first_name} ${p.last_name}`,
        pillars: pillarIds.map((pillarId) => ({
          pillarName: PILLAR_NAME[pillarId] ?? pillarId,
          notes: (notesByPlayerPillar.get(`${playerId}::${pillarId}`) ?? []).join(" | "),
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
    },
  );

  if (players.length === 0 || players.every((p) => p.pillars.length === 0)) {
    console.warn(
      `Skipped squad insight for team ${session.team_id}: no player/pillar data found in the last ${WINDOW_DAYS} days.`,
    );
    return;
  }

  const tip = await generateSquadInsight({
    teamName: team.name,
    ageBand: team.age_band,
    sessions: (recentSessions ?? []).map((s) => ({ type: s.type, date: s.date })),
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
