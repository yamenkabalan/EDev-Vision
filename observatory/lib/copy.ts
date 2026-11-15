/*
  Strings of the AI chat (floating window and AI section), so a translation
  only touches this file. Functions are used where a value is inserted.
*/
export const COPY = {
  chat: {
    title: 'Ask AI about the world’s water',
    fab: 'Ask AI about the world’s water',
    intro: 'Ask about any country, continent or the whole world: its water by year, rain, heat, El Niño and the projection to 2030. Answers come only from the data on this site.',
    prompts: ['Which countries may have less water in 2030?', 'What drives water in the place I selected?'],
    context: (place: string | null) => `Using: ${place ?? 'the whole world'}`,
    inputLabel: 'Your question about the world’s water',
    placeholder: 'Ask about water, weather, or the data…',
    send: 'Ask',
    note: 'AI can be wrong. Compare answers with the data panels.',
    thinking: 'Reading the field notes',
    you: 'YOU',
    ai: 'RSYNTHESIS AI',
    minimise: 'Minimise',
    restore: 'Restore',
    expand: 'Expand',
    shrink: 'Shrink',
    close: 'Close',
  },
} as const;
