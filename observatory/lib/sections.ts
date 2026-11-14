/**
 * The pages below the opening screen, in reading order. The right-hand rail,
 * the section numbers and the mobile progress bar all read this list, so a
 * section is added or renamed in one place.
 */
export type SectionId = 'what' | 'observatory' | 'compare' | 'history' | 'graphics' | 'future' | 'solutions' | 'ai' | 'sources';

export type Section = { id: SectionId; label: string; hint: string };

export const SECTIONS: readonly Section[] = [
  { id: 'what', label: 'What is RSynthesis AI', hint: 'Data + AI = estimation' },
  { id: 'observatory', label: 'All-in-one radar', hint: 'Seven layers, one map' },
  { id: 'compare', label: 'Compare', hint: 'Two moments, one place' },
  { id: 'history', label: 'History', hint: '41 years of water' },
  { id: 'graphics', label: 'Graphics', hint: 'Charts up to 2030' },
  { id: 'future', label: 'Future', hint: 'With our private algorithm' },
  { id: 'solutions', label: 'What should be done', hint: 'Causes and lessons' },
  { id: 'ai', label: 'AI', hint: 'Ask the delta' },
  { id: 'sources', label: 'Sources', hint: 'Team, method, references' },
];

/** "02" for the observatory: the number printed beside a section title. */
export const sectionNumber = (id: SectionId) => String(SECTIONS.findIndex(s => s.id === id) + 1).padStart(2, '0');
