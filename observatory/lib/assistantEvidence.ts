import context from '@/public/data/world-context.json';

type Place = (typeof context.places)[keyof typeof context.places];
type Turn = { role: 'user' | 'assistant'; content: string };
const places = Object.entries(context.places) as [string, Place][];
const aliases: Record<string, string> = {
  usa: 'United States of America', 'united states': 'United States of America',
  uk: 'U.K. of Great Britain and Northern Ireland',
  turkiye: 'Turkey',
};

function plain(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function mentioned(text: string) {
  const haystack = plain(text);
  const candidates = [...places.map(([key, p]) => ({ key, name: p.name })),
    ...Object.entries(aliases).map(([name, target]) => ({ key: places.find(([, p]) => p.name === target)?.[0] ?? '', name }))]
    .filter(x => x.key && x.name.length > 1)
    .flatMap(x => {
      const needle = plain(x.name);
      const at = haystack.indexOf(needle);
      if (at < 0) return [];
      const before = haystack[at - 1], after = haystack[at + needle.length];
      return (!before || !/[\p{L}\p{N}]/u.test(before)) && (!after || !/[\p{L}\p{N}]/u.test(after))
        ? [{ ...x, at, end: at + needle.length }] : [];
    })
    .sort((a, b) => a.at - b.at || b.name.length - a.name.length);
  const chosen: typeof candidates = [];
  for (const candidate of candidates) {
    if (!chosen.some(x => candidate.at < x.end && candidate.end > x.at) && !chosen.some(x => x.key === candidate.key)) chosen.push(candidate);
  }
  return chosen.slice(0, 3).map(x => x.key);
}

/** Select only the records relevant to a question, including its conversation context. */
export function evidenceFor(turns: Turn[]) {
  const latest = turns.at(-1)?.content ?? '';
  let keys = mentioned(latest);
  if (!keys.length) {
    for (const turn of turns.slice(0, -1).reverse()) {
      if (turn.role !== 'user') continue;
      keys = mentioned(turn.content);
      if (keys.length) break;
    }
  }
  if (!keys.length) keys = ['gworld'];
  return {
    names: keys.map(key => context.places[key as keyof typeof context.places].name),
    records: keys.map(key => ({ key, ...context.places[key as keyof typeof context.places] })),
  };
}
