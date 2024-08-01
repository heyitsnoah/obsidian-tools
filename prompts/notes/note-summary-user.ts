export function getNoteSummarizationPrompt(filename: string, content: string) {
  return `
Analyze the following note content thoroughly and create a detailed summary in bullet point format:

<note_filename>
${filename}
</note_filename>
<note_content>
${content}
</note_content>

Your summary should:
- Capture all significant information, ideas, and concepts mentioned in the note
- Maintain the original context and intent of the information
- Be comprehensive enough that it could be used to reconstruct the main points of the original note
- Include specific details, names, dates, and figures where relevant
- Preserve any chronological or logical order present in the original note

Organize your summary using the following structure:
- Start with a brief overview of the note's main topic or purpose (if clear)
- Group related points together under appropriate subheadings
- Use nested bullet points to show relationships between ideas

Use consistent formatting:
- Main points should be preceded by a "-" (hyphen)
- Subpoints should be indented and preceded by a "•" (bullet point)
- Further nested points should use "○" (hollow circle)

Include in your summary, if present in the note:
- Dates and deadlines
- Names of people or organizations
- Numerical data or statistics
- URLs or references to external sources
- Action items or to-do lists
- Questions or areas of uncertainty
- Key decisions or conclusions

Provide only the detailed bullet-point summary within <summary> tags, with no additional text before or after the tags.
`
}
