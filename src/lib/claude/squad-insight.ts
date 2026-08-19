import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

export type SquadInsightPillar = {
  pillarName: string;
  notes: string;
  questions: { question_text: string; anchor: string; score: number }[];
};

export type SquadInsightPlayer = {
  playerName: string;
  pillars: SquadInsightPillar[];
};

export type SquadInsightInput = {
  teamName: string;
  ageBand: string;
  sessionType: string;
  sessionDate: string;
  players: SquadInsightPlayer[];
};

const SYSTEM_PROMPT = `You are an experienced, encouraging grassroots football coach reviewing every player's ratings and notes from a single session, looking for ONE pattern that shows up across MULTIPLE players.

Every player already gets their own individual development report with player-specific priorities, so your job is different: spot something shared across the squad that a coach reviewing individual reports one at a time would miss.

Rules:
- The pattern must genuinely appear in at least two players' ratings, anchor descriptions, or notes - never invent one.
- If nothing shared genuinely stands out, say plainly that this session didn't reveal a clear squad-wide pattern, rather than forcing one.
- Plain English, no jargon.
- Include one concrete, practical suggestion the coach could act on next session.
- 1-2 sentences maximum. This is a quick note, not a report.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{ "tip": "1-2 sentence squad-wide observation and suggestion" }`;

function buildUserPrompt(input: SquadInsightInput): string {
  const playerBlocks = input.players
    .map((player) => {
      const pillarBlocks = player.pillars
        .map((p) => {
          const qLines = p.questions
            .map(
              (q) =>
                `    - "${q.question_text}" — scored ${q.score}/5: ${q.anchor}`,
            )
            .join("\n");
          return `  ${p.pillarName}:\n${qLines}${
            p.notes ? `\n    Coach's notes: ${p.notes}` : ""
          }`;
        })
        .join("\n");
      return `${player.playerName}:\n${pillarBlocks}`;
    })
    .join("\n\n");

  return `Team: ${input.teamName} (${input.ageBand})
Session: ${input.sessionType} on ${input.sessionDate}

${playerBlocks}`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function generateSquadInsight(
  input: SquadInsightInput,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  let parsed: { tip: string };
  try {
    parsed = JSON.parse(stripCodeFences(textBlock.text));
  } catch {
    throw new Error("Claude's response wasn't valid JSON.");
  }

  if (!parsed.tip) {
    throw new Error("Claude's response was missing the tip.");
  }

  return parsed.tip;
}
