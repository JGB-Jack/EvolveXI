import Anthropic from "@anthropic-ai/sdk";

// Haiku, not Sonnet - this is a small, well-constrained rewrite of a
// handful of already-written priorities, not the cross-field reasoning
// the full report needs.
const MODEL = "claude-haiku-4-5-20251001";

export type ParentSuggestionsInput = {
  playerName: string;
  gender: string | null;
  ageBand: string;
  priorities: { text: string }[];
};

// Reuses the coach report's own summary/pillars/strengths as-is - only the
// priorities differ, swapping the coach drill ("practice") for something
// the player can do alone, and there's no training-focus note since that's
// coach planning, not something a parent needs.
export type ParentReportContent = {
  summary: string;
  pillars: { pillar_id: string; narrative: string }[];
  strengths: string[];
  priorities: { text: string; selfPractice: string }[];
};

function pronounInstruction(gender: string | null): string {
  if (gender === "male") return "Use he/him/his when referring to the player.";
  if (gender === "female") return "Use she/her/hers when referring to the player.";
  return "The player's gender isn't specified - use they/them/theirs when referring to the player.";
}

const SYSTEM_PROMPT = `You are an experienced grassroots football coach turning a player's development priorities into things the player can practice completely on their own, away from team training and matches - no coach, no teammates, nothing beyond a ball, a wall, or a back garden or park.

Rules:
- Exactly one self-practice suggestion per priority given, in the same order.
- Each suggestion must be something the player can genuinely do alone (or with a parent just watching or rebounding a ball back) - never something needing a coach, a full team, or specialised equipment.
- Concrete enough to just go and do it, e.g. "10 minutes of passing against a wall with your weaker foot" rather than "practice passing more".
- Plain English a parent with no football coaching background can follow.
- Age-appropriate for the given age band.
- Encouraging tone - frame these as fun extra practice, not homework.
- This is grassroots youth football - never use "elite", "professional", "academy", or similar high-performance language. Keep it fun and age-appropriate, not intense.
- Refer to the player by name where natural, and otherwise follow the pronoun instruction given - never default to "they" when a specific gender is given.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{ "suggestions": ["specific self-practice idea for priority 1", "specific self-practice idea for priority 2"] }
"suggestions" must have exactly as many entries as priorities given, in the same order.`;

function buildUserPrompt(input: ParentSuggestionsInput): string {
  const priorityLines = input.priorities
    .map((p, i) => `${i + 1}. ${p.text}`)
    .join("\n");

  return `Player: ${input.playerName}
Pronouns: ${pronounInstruction(input.gender)}
Age band: ${input.ageBand}

Development priorities:
${priorityLines}`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function generateParentSuggestions(
  input: ParentSuggestionsInput,
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  let parsed: { suggestions: string[] };
  try {
    parsed = JSON.parse(stripCodeFences(textBlock.text));
  } catch {
    throw new Error("Claude's response wasn't valid JSON.");
  }

  if (
    !Array.isArray(parsed.suggestions) ||
    parsed.suggestions.length !== input.priorities.length
  ) {
    throw new Error("Claude's response didn't match the priorities given.");
  }

  return parsed.suggestions;
}
