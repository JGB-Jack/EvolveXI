import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

export type ReportContent = {
  summary: string;
  pillars: { pillar_id: string; narrative: string }[];
  strengths: string[];
  priorities: { text: string; practice: string }[];
  trainingFocus: string;
};

export type PillarInput = {
  pillar_id: string;
  pillar_name: string;
  notes: string;
  questions: { question_text: string; anchor: string; score: number }[];
};

export type ReportInput = {
  playerName: string;
  position: string;
  ageBand: string;
  sessionType: string;
  sessionDate: string;
  pillars: PillarInput[];
  standoutMoment: string;
};

const SYSTEM_PROMPT = `You are an experienced, encouraging grassroots football coach writing a player development report for another coach to read and share with the player and their parent.

Rules:
- Plain English. No jargon. A parent with no football coaching background should understand every sentence.
- Every strength and priority must be specific and named (e.g. "Pressing after losing the ball"), never generic praise (e.g. "good attitude").
- Explain WHY something matters developmentally, not just what the score was.
- Tone: encouraging and developmental, never harsh or discouraging, even for low scores.
- Base everything strictly on the ratings, anchor descriptions, and notes provided. Do not invent specific incidents that weren't mentioned, other than lightly building on the "standout moment" if one was given.
- Each development priority must include one concrete, practical practice suggestion the coach could actually run in a session.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "summary": "2-3 sentence overall summary in plain English",
  "pillars": [{ "pillar_id": "technical", "narrative": "1-2 sentences on what was observed and why it matters" }],
  "strengths": ["specific named strength", "specific named strength", "specific named strength"],
  "priorities": [{ "text": "specific actionable priority", "practice": "a concrete practice suggestion" }],
  "trainingFocus": "one recommended focus for the next training session"
}

"pillars" must include exactly one entry per pillar given in the input, using the same pillar_id. "strengths" must have exactly 3 entries. "priorities" must have exactly 2 entries.`;

function buildUserPrompt(input: ReportInput): string {
  const pillarBlocks = input.pillars
    .map((p) => {
      const qLines = p.questions
        .map(
          (q) =>
            `  - "${q.question_text}" — scored ${q.score}/5: ${q.anchor}`,
        )
        .join("\n");
      return `${p.pillar_name} (pillar_id: ${p.pillar_id}):\n${qLines}${
        p.notes ? `\n  Coach's notes: ${p.notes}` : ""
      }`;
    })
    .join("\n\n");

  return `Player: ${input.playerName}
Position: ${input.position}
Age band: ${input.ageBand}
Session: ${input.sessionType} on ${input.sessionDate}

${pillarBlocks}
${input.standoutMoment ? `\nStandout moment noted by the coach: ${input.standoutMoment}` : ""}`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function generatePlayerReport(
  input: ReportInput,
): Promise<ReportContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  let parsed: ReportContent;
  try {
    parsed = JSON.parse(stripCodeFences(textBlock.text));
  } catch {
    throw new Error("Claude's response wasn't valid JSON. Try again.");
  }

  if (
    !parsed.summary ||
    !Array.isArray(parsed.pillars) ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.priorities) ||
    !parsed.trainingFocus
  ) {
    throw new Error("Claude's response was missing expected fields. Try again.");
  }

  return parsed;
}
