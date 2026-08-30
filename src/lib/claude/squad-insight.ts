import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

export type SquadInsightPillar = {
  pillarName: string;
  notes: string;
  questions: { question_text: string; anchor: string; score: number; date: string }[];
};

export type SquadInsightPlayer = {
  playerName: string;
  pillars: SquadInsightPillar[];
};

export type SquadInsightInput = {
  teamName: string;
  ageBand: string;
  sessions: { type: string; date: string }[];
  players: SquadInsightPlayer[];
};

const SYSTEM_PROMPT = `You are an experienced, encouraging grassroots football coach reviewing every player's ratings and notes from the team's recent sessions, looking for ONE pattern that shows up across MULTIPLE players.

Every player already gets their own individual development report with player-specific priorities, so your job is different: spot something shared across the squad that a coach reviewing individual reports one at a time would miss. Where useful, notice whether something is a recurring issue across sessions or a recent change.

Rules:
- The pattern must genuinely appear in at least two players' ratings, anchor descriptions, or notes - never invent one.
- Every question and note is tagged with the date it's from. Only describe something as "improving" or "dropping" if you can point to the same or a closely related question scored differently on two different dates for that player - never infer a trend direction you can't actually trace to dated evidence.
- If nothing shared genuinely stands out, say plainly that recent sessions haven't revealed a clear squad-wide pattern, rather than forcing one.
- Plain English, no jargon.
- Recommend ONE specific, named group drill that targets the pattern, with just enough setup detail (format, e.g. 4v2, grid size, key rule) that a coach could run it next session without looking it up elsewhere.
- Age-appropriate for the given age band - keep instructions and setup simple for younger groups.
- 2-3 sentences maximum: the observation, then the drill. This is a quick note, not a report.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{ "tip": "2-3 sentence squad-wide observation plus a named group drill recommendation" }`;

function buildUserPrompt(input: SquadInsightInput): string {
  const sessionLines = input.sessions
    .map((s) => `  - ${s.date}: ${s.type}`)
    .join("\n");

  const playerBlocks = input.players
    .map((player) => {
      const pillarBlocks = player.pillars
        .map((p) => {
          const qLines = p.questions
            .map(
              (q) =>
                `    - [${q.date}] "${q.question_text}" — scored ${q.score}/5: ${q.anchor}`,
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
Sessions in the last 14 days:
${sessionLines}

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
