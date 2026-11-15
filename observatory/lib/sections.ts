/**
 * The pages below the opening screen, in reading order. The right-hand rail,
 * the section numbers and the mobile progress bar all read this list, so a
 * section is added or renamed in one place.
 */
export type SectionId = 'what' | 'global' | 'observatory' | 'compare' | 'history' | 'graphics' | 'future' | 'solutions' | 'ai' | 'sources';

export type Section = { id: SectionId; label: string; hint: string };

export const SECTIONS: readonly Section[] = [
  { id: 'what', label: 'What is RSynthesis AI', hint: 'Data + AI = estimation' },
  { id: 'global', label: 'Global water', hint: '266 countries, 1984–2018' },
  { id: 'observatory', label: 'All-in-one radar', hint: 'Seven layers, the whole Earth' },
  { id: 'compare', label: 'Compare', hint: 'Any place, two moments' },
  { id: 'history', label: 'History', hint: '35 years, any country' },
  { id: 'graphics', label: 'Graphics', hint: 'Charts up to 2030' },
  { id: 'future', label: 'Future', hint: 'Our engine, your choices' },
  { id: 'solutions', label: 'What should be done', hint: 'Causes and lessons' },
  { id: 'ai', label: 'AI', hint: 'Ask the assistant' },
  { id: 'sources', label: 'Sources', hint: 'Team, method, references' },
];

/** "03" for the radar section: the number printed beside a section title. */
export const sectionNumber = (id: SectionId) => String(SECTIONS.findIndex(s => s.id === id) + 1).padStart(2, '0');
