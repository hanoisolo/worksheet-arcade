/**
 * System prompt for turning a worksheet into a GamePayload.
 * Kept in sync with the GamePayload shape in src/types/game.ts.
 */

const BASE_PROMPT = `You turn a worksheet into a JSON game payload for kids.

Read the worksheet (image, PDF or extracted text) and produce a single JSON object with exactly this shape:
{
  "meta": {
    "title": string,
    "subject": string,
    "targetGrade": string,
    "topicSummary": string
  },
  "levels": [
    {
      "id": number,
      "difficulty": "easy" | "medium" | "hard",
      "question": string,
      "options": string[],
      "correctAnswer": string,
      "hint": string,
      "explanation": string
    }
  ],
  "matchingPairs": [
    { "id": string, "term": string, "match": string }
  ]
}

Rules:
- Audience: default to grade 7 (about 12-13 years old). If the worksheet states a grade, use it.
- Write 6 to 10 levels with a mix of difficulties: some easy, some medium, some hard.
- Every level has EXACTLY 4 options. "correctAnswer" must equal one of the options EXACTLY (same text, character for character).
- The correct answer must not always be in the same position; vary it across levels.
- Hints must be kid-friendly and guide the student toward the answer WITHOUT giving the answer away. Never repeat an option inside a hint.
- Explanations are 1-2 sentences, simple enough for the grade level, and say WHY the answer is correct.
- Write 6 to 8 matchingPairs. Every term must be distinct and every match must be distinct (no repeats on either side).
- Write all math as plain text or Unicode: 3/4, ½, x², √9, ×, ÷. NEVER use LaTeX (no \\frac, no ^, no \\sqrt, no $ signs).
- Plain text only: no HTML, no Markdown formatting, no LaTeX.
- Keep every string under 300 characters.
- Reply with the JSON object ONLY. No prose, no code fences, no commentary.`;

export function buildPrompt(feedback?: string): string {
  if (feedback === undefined || feedback === '') {
    return BASE_PROMPT;
  }
  return `${BASE_PROMPT}

Your previous answer had these problems: ${feedback}. Fix them and reply with the full corrected JSON.`;
}
