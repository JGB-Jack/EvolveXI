import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

export type DrillInput = {
  issue: string;
  ageBand: string;
};

export type DrillOutput = {
  name: string;
  target: string;
  duration: string;
  format: string;
  setup: string;
  constraint: string;
  coachingPoint: string;
};

const SYSTEM_PROMPT = `You are an experienced grassroots football coach helping another coach fix a specific problem they've noticed in matches or training, by suggesting ONE practical drill.

Vague, generic answers are the main failure mode here - every field must be concrete enough that a coach could set the drill up and run it without asking a single follow-up question.

Rules:
- The drill must directly address the described issue - don't suggest something generic that could apply to any problem.
- Age-appropriate for the given age band: simple setup and one clear rule for younger groups, more tactical detail is fine for older groups.
- Assume only basic equipment: cones, bibs, footballs. Nothing specialised.
- "format" states real numbers: exact player count and grid dimensions in metres, e.g. "4v2 rondo, 6 players, 12x12m grid" - never vague terms like "small group" or "a few players".
- "setup" is 2-3 concrete steps describing exactly how to mark out and position players/cones/balls to start the drill - specific enough to physically set up from this alone.
- "constraint" is the ONE specific rule that forces players to fix the issue (e.g. a touch limit, a zone they can't enter, a pass they must make first) - this is what makes the drill work, not just "play normally".
- "coachingPoint" names the exact moment to intervene and an exact phrase or question to say to players - not general encouragement like "encourage good decisions".
- "duration" is a realistic single session chunk, e.g. "8 minutes" or "10-12 minutes".
- "target" is one short sentence restating the problem this drill fixes, in the coach's own terms.
- Plain English, no jargon.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{ "name": "short drill name", "target": "one sentence describing the issue this fixes", "duration": "e.g. 10 minutes", "format": "exact player count and grid size", "setup": "2-3 concrete setup steps", "constraint": "the one rule that forces the fix", "coachingPoint": "the exact moment to intervene and what to say" }`;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function generateDrill(input: DrillInput): Promise<DrillOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Age band: ${input.ageBand}\nIssue: ${input.issue}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  let parsed: DrillOutput;
  try {
    parsed = JSON.parse(stripCodeFences(textBlock.text));
  } catch {
    throw new Error("Claude's response wasn't valid JSON.");
  }

  if (!parsed.name || !parsed.coachingPoint || !parsed.setup || !parsed.constraint) {
    throw new Error("Claude's response was missing required fields.");
  }

  return parsed;
}
