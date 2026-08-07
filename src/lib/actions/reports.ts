"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generatePlayerReport,
  type PillarInput,
  type ReportContent,
} from "@/lib/claude/report";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};

export async function generateReport(sessionId: string, playerId: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("date, type, team_id")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found.");

  const { data: player } = await supabase
    .from("players")
    .select("first_name, last_name, primary_position")
    .eq("id", playerId)
    .single();
  if (!player) throw new Error("Player not found.");

  const { data: team } = await supabase
    .from("teams")
    .select("age_band")
    .eq("id", session.team_id)
    .single();

  const { data: sessionPillars } = await supabase
    .from("session_pillars")
    .select("pillar_id")
    .eq("session_id", sessionId);
  const pillarIds = (sessionPillars ?? []).map((p) => p.pillar_id);

  const { data: assessments } = await supabase
    .from("assessments")
    .select("score, team_questions(pillar_id, question_text, anchor_1, anchor_2, anchor_3, anchor_4, anchor_5)")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  const { data: pillarNotes } = await supabase
    .from("assessment_pillar_notes")
    .select("pillar_id, notes")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);
  const notesByPillar = Object.fromEntries(
    (pillarNotes ?? []).map((n) => [n.pillar_id, n.notes ?? ""]),
  );

  const { data: sessionPlayer } = await supabase
    .from("session_players")
    .select("standout_moment")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .single();

  type AssessmentRow = {
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

  const pillars: PillarInput[] = pillarIds.map((pillarId) => {
    const questions = (assessments as unknown as AssessmentRow[] | null ?? [])
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
      });
    return {
      pillar_id: pillarId,
      pillar_name: PILLAR_NAME[pillarId] ?? pillarId,
      notes: notesByPillar[pillarId] ?? "",
      questions,
    };
  });

  const content = await generatePlayerReport({
    playerName: `${player.first_name} ${player.last_name}`,
    position: player.primary_position,
    ageBand: team?.age_band ?? "",
    sessionType: session.type,
    sessionDate: session.date,
    pillars,
    standoutMoment: sessionPlayer?.standout_moment ?? "",
  });

  const contentJson = JSON.stringify(content);

  const { data: report, error } = await supabase
    .from("reports")
    .upsert(
      {
        session_id: sessionId,
        player_id: playerId,
        generated_text: contentJson,
        edited_text: contentJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,player_id" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { reportId: report.id, content };
}

export async function saveReportEdits(
  reportId: string,
  content: ReportContent,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({
      edited_text: JSON.stringify(content),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
}
