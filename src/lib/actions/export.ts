"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  computeOverallFromRawScores,
  computeOverallFromPillarAverages,
} from "@/lib/pillar-scoring";
import { getLatestFormRows } from "@/lib/data/latest-form";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};
const PILLAR_ORDER = ["technical", "physical", "tactical", "psychological", "social"];

export type PlayerExportRow = {
  firstName: string;
  lastName: string;
  squadNumber: number | null;
  primaryPosition: string;
  secondaryPosition: string | null;
  dob: string | null;
  gender: string | null;
  active: boolean;
};

export type SessionRatingExportRow = {
  sessionDate: string;
  sessionType: string;
  opponent: string | null;
  playerFirstName: string;
  playerLastName: string;
  positionPlayed: string;
  pillar: string;
  question: string;
  score: number;
};

export type SessionOverallExportRow = {
  sessionDate: string;
  sessionType: string;
  opponent: string | null;
  playerFirstName: string;
  playerLastName: string;
  positionPlayed: string;
  overallScore: number;
};

export type SquadRankingExportRow = {
  playerFirstName: string;
  playerLastName: string;
  squadNumber: number | null;
  position: string;
  overallScore: number;
  technical: number | null;
  physical: number | null;
  tactical: number | null;
  psychological: number | null;
  social: number | null;
};

export async function exportTeamData(): Promise<
  | {
      players: PlayerExportRow[];
      ratings: SessionRatingExportRow[];
      sessionOverallScores: SessionOverallExportRow[];
      squadRankings: SquadRankingExportRow[];
    }
  | { error: string }
> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, pillar_weights")
    .eq("coach_id", user.id)
    .single();
  if (!team) return { error: "Couldn't find your team." };

  const { data: playerRows, error: playersError } = await supabase
    .from("players")
    .select(
      "first_name, last_name, squad_number, primary_position, secondary_position, dob, gender, active",
    )
    .eq("team_id", team.id)
    .order("last_name");
  if (playersError) return { error: playersError.message };

  const players: PlayerExportRow[] = (playerRows ?? []).map((p) => ({
    firstName: p.first_name,
    lastName: p.last_name,
    squadNumber: p.squad_number,
    primaryPosition: p.primary_position,
    secondaryPosition: p.secondary_position,
    dob: p.dob,
    gender: p.gender,
    active: p.active,
  }));

  type AssessmentRow = {
    session_id: string;
    player_id: string;
    score: number;
    sessions: { date: string; type: string; opponent: string | null };
    players: { first_name: string; last_name: string };
    team_questions: { question_text: string; pillar_id: string };
  };

  const { data: assessmentRows, error: assessmentsError } = await supabase
    .from("assessments")
    .select(
      "session_id, player_id, score, sessions!inner(date, type, opponent, team_id), players!inner(first_name, last_name), team_questions!inner(question_text, pillar_id)",
    )
    .eq("sessions.team_id", team.id)
    .order("date", { referencedTable: "sessions" });
  if (assessmentsError) return { error: assessmentsError.message };

  const rows = (assessmentRows ?? []) as unknown as AssessmentRow[];

  const { data: positionRows, error: positionsError } = await supabase
    .from("session_players")
    .select("session_id, player_id, position_played, sessions!inner(team_id)")
    .eq("sessions.team_id", team.id);
  if (positionsError) return { error: positionsError.message };
  const positionPlayed = new Map(
    (positionRows ?? []).map((r) => [
      `${r.session_id}:${r.player_id}`,
      r.position_played as string,
    ]),
  );

  const ratings: SessionRatingExportRow[] = rows.map((a) => ({
    sessionDate: a.sessions.date,
    sessionType: a.sessions.type,
    opponent: a.sessions.opponent,
    playerFirstName: a.players.first_name,
    playerLastName: a.players.last_name,
    positionPlayed: positionPlayed.get(`${a.session_id}:${a.player_id}`) ?? "",
    pillar: PILLAR_NAME[a.team_questions.pillar_id] ?? a.team_questions.pillar_id,
    question: a.team_questions.question_text,
    score: a.score,
  }));

  // One overall average per (session, player) - weighted per the team's
  // pillar_weights (or equal weight per pillar if unset), same method
  // every other screen uses now.
  const bySessionPlayer = new Map<
    string,
    { scoresByPillar: Record<string, number[]>; row: AssessmentRow }
  >();
  for (const a of rows) {
    const key = `${a.session_id}:${a.player_id}`;
    const entry = bySessionPlayer.get(key) ?? { scoresByPillar: {}, row: a };
    const pillarId = a.team_questions.pillar_id;
    (entry.scoresByPillar[pillarId] ??= []).push(a.score);
    bySessionPlayer.set(key, entry);
  }
  const sessionOverallScores: SessionOverallExportRow[] = Array.from(
    bySessionPlayer.values(),
  ).map(({ scoresByPillar, row }) => ({
    sessionDate: row.sessions.date,
    sessionType: row.sessions.type,
    opponent: row.sessions.opponent,
    playerFirstName: row.players.first_name,
    playerLastName: row.players.last_name,
    positionPlayed: positionPlayed.get(`${row.session_id}:${row.player_id}`) ?? "",
    overallScore:
      Math.round(
        (computeOverallFromRawScores(scoresByPillar, team.pillar_weights).overall ?? 0) *
          100,
      ) / 100,
  }));

  // Same computation the Rankings page itself uses: each player's most
  // recent score per pillar, averaged per pillar, then combined across
  // pillars for an overall (weighted per the team's pillar_weights, or
  // equal weight per pillar if unset, not a raw score average) - kept
  // consistent so this export matches what's on screen.
  const formRows = await getLatestFormRows(supabase, team.id);
  type PillarAgg = {
    firstName: string;
    lastName: string;
    squadNumber: number | null;
    position: string;
    pillarSums: Record<string, { sum: number; count: number }>;
  };
  const byPlayer = new Map<string, PillarAgg>();
  for (const row of formRows) {
    if (!row.player || row.player.active === false) continue;
    let agg = byPlayer.get(row.player_id);
    if (!agg) {
      agg = {
        firstName: row.player.first_name,
        lastName: row.player.last_name,
        squadNumber: row.player.squad_number,
        position: row.player.primary_position,
        pillarSums: {},
      };
      byPlayer.set(row.player_id, agg);
    }
    const entry = agg.pillarSums[row.pillar_id] ?? { sum: 0, count: 0 };
    entry.sum += row.score;
    entry.count += 1;
    agg.pillarSums[row.pillar_id] = entry;
  }

  const squadRankings: SquadRankingExportRow[] = Array.from(byPlayer.values())
    .map((agg) => {
      const pillarAverages = Object.fromEntries(
        PILLAR_ORDER.map((id) => [
          id,
          agg.pillarSums[id]
            ? Math.round((agg.pillarSums[id].sum / agg.pillarSums[id].count) * 100) / 100
            : null,
        ]),
      ) as Record<string, number | null>;
      const overall =
        Math.round(
          (computeOverallFromPillarAverages(pillarAverages, team.pillar_weights) ?? 0) *
            100,
        ) / 100;
      return {
        playerFirstName: agg.firstName,
        playerLastName: agg.lastName,
        squadNumber: agg.squadNumber,
        position: agg.position,
        overallScore: overall,
        technical: pillarAverages.technical,
        physical: pillarAverages.physical,
        tactical: pillarAverages.tactical,
        psychological: pillarAverages.psychological,
        social: pillarAverages.social,
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore);

  return { players, ratings, sessionOverallScores, squadRankings };
}
