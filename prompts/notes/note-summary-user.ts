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
  
  Use this exact formatting consistently throughout your summary:
  - Main points: Preceded by a "-" (hyphen)
  - Subpoints: Indented with 2 spaces and preceded by a "•" (bullet point)
  - Further nested points: Indented with 4 spaces and preceded by a "○" (hollow circle)
  - Do not use any other symbols for bullet points
  
  Example of correct formatting:
  - Main point
    • Subpoint
      ○ Further nested point
  - Another main point
    • Another subpoint
  
  Include in your summary, if present in the note:
  - Dates and deadlines
  - Names of people or organizations
  - Numerical data or statistics
  - URLs or references to external sources
  - Action items or to-do lists
  - Questions or areas of uncertainty
  - Key decisions or conclusions
  
  Important: Provide only the detailed bullet-point summary within <summary> tags. Do not include any additional text, explanations, or formatting outside of these tags.
  `
}
export function getDiffSummarizationPrompt(diffContent: string) {
  return `
  Analyze the following diff content thoroughly and create a detailed summary of the changes:
  
  <diff_content>
  ${diffContent}
  </diff_content>
  
  Your summary should:
  - Capture all changes, additions, and deletions in the diff
  - Describe any significant unchanged content for context
  - Maintain the context of the changes
  - Be comprehensive enough to understand the nature and impact of the modifications
  - Include specific details, such as line numbers or section identifiers, where available
  - Preserve the order of changes as they appear in the diff
  
  Organize your summary using the following structure:
  - Start with a brief overview of the main changes
  - Group related changes together under appropriate subheadings
  - Use nested bullet points to show relationships between changes
  
  Use this exact formatting consistently throughout your summary:
  - Main points (file changes or major sections): Preceded by a "-" (hyphen)
  - Additions: Indented with 2 spaces and preceded by a "+" (plus sign)
  - Deletions: Indented with 2 spaces and preceded by a "-" (minus sign)
  - Unchanged content or context: Indented with 2 spaces and preceded by a "•" (bullet point)
  - Comments on changes: Indented with 4 spaces and preceded by a "○" (hollow circle)
  
  Example of correct formatting:
  - Changes to example.txt
    + Line 5: Added new section on AI applications
      ○ This addition provides up-to-date information on recent developments
    - Lines 10-12: Removed outdated references
      ○ Removal of obsolete information improves the document's relevance
    • Lines 1-4 and 13-20: Content remained unchanged
      ○ Surrounding context helps understand the scope of changes
  
  Include in your summary:
  - File names affected by the changes
  - Line numbers or ranges of changes (if available)
  - New content added
  - Content removed
  - Unchanged content providing important context
  - Any metadata present in the diff (e.g., commit messages, if available)
  - Brief comments on the potential purpose or impact of significant changes
  
  Important: Provide only the detailed bullet-point summary of the diff within <summary> tags. Do not include any additional text, explanations, or formatting outside of these tags.
  `
}
