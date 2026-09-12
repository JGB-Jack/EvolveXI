import Anthropic from "@anthropic-ai/sdk";

// Sonnet, not Haiku - same reasoning as the single-drill generator: this
// needs headcounts and kit to stay consistent across two linked parts, plus
// real judgement about what a coach with zero notice can actually run.
const MODEL = "claude-sonnet-5";

export type SessionKit = {
  cones: boolean;
  bibs: boolean;
  balls: boolean;
  mannequins: boolean;
  poles: boolean;
  miniGoals: boolean;
  largeGoals: boolean;
};

export type PitchSize = "quarter" | "half" | "full";

export type SessionInput = {
  ageBand: string;
  playerCount: number;
  supportCoaches: number;
  minutesAvailable: number;
  pitchSize: PitchSize;
  kit: SessionKit;
  otherKit: string;
  focus: string;
};

export type TechnicalPractice = {
  name: string;
  duration: string;
  format: string;
  setup: string;
  constraint: string;
  coachingPoint: string;
};

export type SmallSidedGame = {
  name: string;
  duration: string;
  format: string;
  setup: string;
  coachingPoint: string;
};

export type SessionPlan = {
  technicalPractice: TechnicalPractice;
  smallSidedGame: SmallSidedGame;
};

const PITCH_SIZE_LABEL: Record<PitchSize, string> = {
  quarter: "a quarter of a full pitch",
  half: "half a full pitch",
  full: "a full pitch",
};

const KIT_LABEL: Record<keyof SessionKit, string> = {
  cones: "cones",
  bibs: "bibs",
  balls: "balls",
  mannequins: "mannequins",
  poles: "poles",
  miniGoals: "mini goals",
  largeGoals: "large goals",
};

const SYSTEM_PROMPT = `You are an experienced grassroots football coach helping another coach who has turned up to train their team with no prepared plan - unknown numbers, whatever kit happens to be in the bag, whoever else showed up to help. You build them a complete, ready-to-run session on the spot.

A session has exactly two parts: ONE technical practice, followed by ONE small-sided game. No warm-up, no cool-down - the coach only wants these two parts.

Vague, generic answers are one failure mode - every field must be concrete enough that a coach could set it up and run it without asking a single follow-up question. An equally serious failure mode is INTERNAL INCONSISTENCY - a plan that doesn't actually fit the numbers, kit, space, or time given.

Rules:
- Only use kit that's actually available - never mention cones, bibs, balls, mannequins, poles, mini goals, large goals, or any other item that wasn't given as available. If nothing but balls is available, design around that constraint rather than assuming basics like cones exist.
- Every player must be accounted for in both parts - the headcount in each part's "format" must exactly match the total player count given. Recount before answering.
- If zero support coaches are available, everything must be runnable by ONE coach watching one thing at a time - never split players into multiple simultaneously-running stations or grids that need independent supervision. With one or more support coaches, running two supervised groups at once becomes reasonable.
- More than 20 players is too many for one grid or one game to work well - split the squad into two named groups (e.g. "Group A" and "Group B") of roughly equal size for BOTH parts of the session, and say each group's headcount in "format". If there's at least one support coach, the two groups run side by side at the same time (one adult supervising each); with zero support coaches, they take turns one after another in the same space instead - make that turn-taking explicit in "setup" and keep both groups' combined time within the total minutes available.
- Pitch size is given as a category relative to a full-size pitch for this age group, not exact metres - translate it into sensible, concrete metre dimensions yourself for "format"/"setup", appropriate to the age band, and never describe an area bigger than that category allows.
- The coach has told you the specific skill or theme to focus this session on - build BOTH the technical practice and the small-sided game around that exact theme (never substitute a different one), so the session reads as one connected idea, not two random activities.
- "duration" for the two parts together must add up to no more than the total minutes available - split the time sensibly between them (a technical practice usually gets a smaller share than the game, but use judgement).
- Age-appropriate for the given age band: simple setup and one clear rule for younger groups, more tactical detail is fine for older groups.
- "format" states real numbers: exact player count and grid/pitch dimensions in metres, e.g. "4v4 + 1 neutral, 25x20m" - never vague terms like "small group" or "a few players".
- "setup" is 2-3 concrete steps describing exactly how to mark out and position everyone to start - specific enough to physically set up from this alone, using only the available kit.
- "constraint" (technical practice only) is the ONE specific rule that forces players to work on the target skill - this is what makes the practice work, not just "practice normally".
- "coachingPoint" names the exact moment to intervene and an exact phrase or question to say to players - not general encouragement like "encourage good decisions". The small-sided game's coaching point should reinforce the same skill the technical practice targeted.
- Plain English, no jargon.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{ "technicalPractice": { "name": "short name", "duration": "e.g. 10 minutes", "format": "exact player count and grid size", "setup": "2-3 concrete setup steps", "constraint": "the one rule that forces the skill", "coachingPoint": "the exact moment to intervene and what to say" }, "smallSidedGame": { "name": "short name", "duration": "e.g. 15 minutes", "format": "exact teams/numbers and pitch size", "setup": "2-3 concrete setup steps", "coachingPoint": "the exact moment to intervene and what to say, reinforcing the practice" } }`;

function buildUserPrompt(input: SessionInput): string {
  const kitItems = (Object.keys(input.kit) as (keyof SessionKit)[])
    .filter((item) => input.kit[item])
    .map((item) => KIT_LABEL[item]);
  if (input.otherKit.trim()) {
    kitItems.push(input.otherKit.trim());
  }
  const kitList = kitItems.join(", ");

  return `Age band: ${input.ageBand}
Focus for this session: ${input.focus}
Players: ${input.playerCount}
Support coaches available (in addition to me): ${input.supportCoaches}
Time available: ${input.minutesAvailable} minutes
Space available: ${PITCH_SIZE_LABEL[input.pitchSize]}
Kit available: ${kitList || "none"}`;
}

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

export async function generateSessionPlan(input: SessionInput): Promise<SessionPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    // Sonnet 5 runs adaptive thinking by default, and how much it spends
    // thinking varies a lot run to run (seen anywhere from ~1200 to ~2400
    // tokens on this task alone) - too low a cap risks the response getting
    // cut off mid-thought before any JSON is written. 16000 gives generous
    // headroom above the largest thinking spend seen plus the full JSON body.
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  let parsed: SessionPlan;
  try {
    parsed = JSON.parse(stripCodeFences(textBlock.text));
  } catch {
    try {
      parsed = JSON.parse(removeTrailingCommas(extractJsonObject(textBlock.text)));
    } catch {
      console.error("[generateSessionPlan] unparsable response:", textBlock.text);
      throw new Error("Claude's response wasn't valid JSON.");
    }
  }

  if (
    !parsed.technicalPractice?.name ||
    !parsed.technicalPractice?.constraint ||
    !parsed.smallSidedGame?.name ||
    !parsed.smallSidedGame?.format
  ) {
    throw new Error("Claude's response was missing required fields.");
  }

  return parsed;
}
