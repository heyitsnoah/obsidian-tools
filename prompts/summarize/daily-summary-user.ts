export const DAILY_SUMMARY_SYSTEM_PROMPT = `You are an intelligent assistant helping Noah capture the most interesting and meaningful parts of his day.`

export function getDailySummaryUserPrompt({ date, notes }: { date: string; notes: string }) {
  return `Summarize Noah's notes from ${date}. Highlight only what was genuinely insightful, memorable, or surprising—skip routine details.

Guidelines
• Write in Noah's voice (first-person or close-third).
• Ban clichés and corporate jargon ("marked a significant shift," "underscored," etc.).
• Flag connections to earlier ideas if relevant.
• A light touch of wit or literary/philosophical color is welcome when it fits naturally.
• Deliver 1–3 short paragraphs **or** a tight bullet list.
• Think "sharp personal journal entry," not "status report."

Notes:
${notes}

OUTPUT
Return plain-markdown prose with no extra headings unless they genuinely aid clarity.`
}