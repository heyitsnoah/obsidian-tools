export function getNoteSummarizationPrompt(filename: string, content: string) {
  return `
You are tasked with creating a concise yet comprehensive summary of a note. The summary should consist of a brief paragraph overview followed by a detailed list of bullet points.

Here is the note to summarize:

<note_filename>
${filename}
</note_filename>

<note_content>
${content}
</note_content>

First, create a brief paragraph (3-5 sentences) that captures the main topic or purpose of the note. This paragraph should provide an overview of the key points without going into specific details.

Next, create a detailed list of bullet points that:
- Captures all significant information, ideas, and concepts mentioned in the note
- Maintains the original context and intent of the information
- Is comprehensive enough that it could be used to reconstruct the main points of the original note
- Includes specific details, names, dates, and figures where relevant
- Preserves any chronological or logical order present in the original note

Use the following Markdown-compatible formatting for your bullet point list:
- Main points: Use - (hyphens)
- Subpoints: Indent with 2 spaces, then use -
- Further nested points: Indent with 4 spaces, then use -

Example of correct formatting:
- Main point
  - Subpoint
    - Further nested point
- Another main point
  - Another subpoint

Include in your summary, if present in the note:
- Dates and deadlines
- Names of people or organizations
- Numerical data or statistics
- URLs or references to external sources
- Action items or to-do lists
- Questions or areas of uncertainty
- Key decisions or conclusions

Provide your summary in the following format:
<summary>
[Paragraph overview]

[Detailed bullet point list]
</summary>

Important: Provide only the summary paragraph and detailed bullet-point list using the specified Markdown-compatible formatting. Do not include any additional text, explanations, or formatting outside of the summary tags.
`
}
export function getDiffSummarizationPrompt(diffContent: string) {
  return `
Analyze the following diff content and create a concise summary of the key changes:

<diff_content>
${diffContent}
</diff_content>

Your summary should:
1. Start with a brief one-sentence overview of the main changes.
2. List the key updates, focusing on what was added, removed, or modified.
3. Ignore minor changes like whitespace or formatting unless they are significant.
4. Mention file names affected by the changes, if available.
5. Provide a brief explanation of the purpose or impact of significant changes, if apparent.

Use the following format for your summary:
<summary>
[One-sentence overview]

Key changes:
- [Change description]
- [Change description]
...

</summary>

Important: Focus on providing a clear, concise list of the main updates. Do not include extensive formatting or unnecessary details. Your goal is to give a quick understanding of what has changed.
`
}
