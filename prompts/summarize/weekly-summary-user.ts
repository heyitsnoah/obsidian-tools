export const WEEKLY_SUMMARY_SYSTEM_PROMPT = `You are an insightful assistant helping Noah review his week and spot patterns across time.`

export function getWeeklySummaryUserPrompt({ endDate, startDate, summaries }: { endDate: string; startDate: string; summaries: string }) {
  return `Write a recap of ${startDate} – ${endDate}. Emphasize what changed, what surprised Noah, and themes that emerged across multiple days.

Guidelines
• Use Noah's voice; avoid third-person references.
• Explicitly connect ideas that resurfaced or evolved during the week.
• No boilerplate sections or phrases (e.g., "Strategic Implications," "marked progress").
• Intellectual curiosity encouraged—philosophy or literature only if it deepens the point.
• 2–4 short paragraphs or a grouped bullet list; skimmable in <30 s.

Summaries:
${summaries}

OUTPUT
Plain-markdown; flexible structure.`
}