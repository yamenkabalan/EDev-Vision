/*
  Shared copy for the Okavango assistant.
*/
export const COPY = {
  chat: {
    title: 'Ask AI about the Okavango Delta',
    fab: 'Ask AI about the Okavango Delta',
    intro: 'Ask about the Okavango Delta’s radar observations, Landsat water history or projected water area.',
    prompts: ['What did NISAR measure in the Okavango Delta?', 'What can you tell me about the Landsat record for the delta?'],
    inputLabel: 'Your question about the Okavango Delta',
    placeholder: 'Ask about water in the Okavango Delta…',
    send: 'Ask',
    note: 'AI answers can be wrong. Use Global water and Future to explore other places.',
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
