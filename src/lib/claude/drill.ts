import Anthropic from "@anthropic-ai/sdk";

// Sonnet, not Haiku - this task needs real cross-field reasoning (headcounts
// that must add up, roles that must stay consistent across fields), which
// Haiku kept getting wrong (mismatched player counts, undefined roles). It's
// a rare, on-demand call, so the extra cost per generation is worth it.
const MODEL = "claude-sonnet-5";

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

Vague, generic answers are one failure mode - every field must be concrete enough that a coach could set the drill up and run it without asking a single follow-up question. An equally serious failure mode is INTERNAL INCONSISTENCY - setup, constraint, and coachingPoint describing pieces that don't fit together into one coherent drill. Both matter equally.

Rules:
- The drill must directly address the described issue - don't suggest something generic that could apply to any problem.
- Name every group of players ONCE (e.g. "attackers" and "defenders") and use those exact same names in setup, constraint, and coachingPoint - never introduce a synonym for a group partway through (don't call the same group "outfield players" in setup and "attackers" in the rule).
- Every group and every player mentioned in setup must have a stated, ongoing job for the whole drill - if you mention players starting outside a grid, say what they do once the drill starts (join in, rotate in after a score, feed new balls, etc). Never leave a group's role unexplained.
- If setup introduces any prop (bib numbers, colours, cone markers), the constraint or coachingPoint must actually use it - never mention a prop that goes nowhere.
- Add up every player you mention across every group, including any neutral/wildcard/goalkeeper - that total must exactly match the headcount stated in "format". Recount before answering.
- State plainly whether the named groups are competing against each other, working independently side by side, or rotating through roles - never leave this ambiguous.
- State what success looks like for the players during the drill (what they're trying to achieve or score), not just what they're restricted from doing.
- Before finalizing, check your own answer: could a coach who only reads setup, format, constraint, and coachingPoint run one full rep of this drill start to finish without any undefined role, player, prop, or unclear headcount? If not, simplify until they can.
- Age-appropriate for the given age band: simple setup and one clear rule for younger groups, more tactical detail is fine for older groups.
- Assume only basic equipment: cones, bibs, footballs. Nothing specialised.
- "format" states real numbers: exact player count and grid dimensions in metres, e.g. "4v2 rondo, 6 players, 12x12m grid" - never vague terms like "small group" or "a few players".
- "setup" is 2-3 concrete steps describing exactly how to mark out and position every named group to start the drill - specific enough to physically set up from this alone.
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

// Sonnet occasionally adds a stray sentence before or after the JSON
// despite being told not to - fall back to the outermost {...} span rather
// than failing outright on what's otherwise a perfectly good response.
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

// Trailing commas before a closing brace/bracket are invalid JSON but a
// common model slip (leftover from writing it like a JS object literal).
function removeTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, "$1");
}

export async function generateDrill(input: DrillInput): Promise<DrillOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
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
    try {
      parsed = JSON.parse(
        removeTrailingCommas(extractJsonObject(textBlock.text)),
      );
    } catch {
      console.error("[generateDrill] unparsable response:", textBlock.text);
      throw new Error("Claude's response wasn't valid JSON.");
    }
  }

  if (!parsed.name || !parsed.coachingPoint || !parsed.setup || !parsed.constraint) {
    throw new Error("Claude's response was missing required fields.");
  }

  return parsed;
}
