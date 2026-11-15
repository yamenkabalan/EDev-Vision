'use client';
import type { Place, Selection, World } from '@/lib/world';

/*
  One place selector for sections 03-08: the whole world, a continent, a
  country, or two countries side by side. The choice is shared, so the place
  picked in one section follows the reader down the page.
*/
const MODES: { id: Selection['mode']; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'continent', label: 'Continent' },
  { id: 'country', label: 'Country' },
  { id: 'compare', label: 'Two countries' },
];

/** Countries with at least one measured year, alphabetically. */
export function countryOptions(world: World) {
  return world.countries.filter(c => c.values.some(v => v && v[0] + v[1] > 0)).sort((a, b) => a.name.localeCompare(b.name));
}

export default function PlacePicker({ world, value, onChange, allowCompare = true, compact = false, onSee }: { world: World; value: Selection; onChange: (s: Selection) => void; allowCompare?: boolean; compact?: boolean; onSee?: (p: Place) => void }) {
  const countries = countryOptions(world);
  const continents = world.groups.filter(g => g.kind === 'continent');
  const set = (patch: Partial<Selection>) => onChange({ ...value, ...patch });
  const pickMode = (mode: Selection['mode']) => {
    const a = world.byKey.get(value.a);
    if (mode === 'world') return set({ mode, a: 'gworld' });
    if (mode === 'continent') return set({ mode, a: a?.kind === 'continent' ? a.key : 'gafrica' });
    const country = a?.kind === 'country' ? a.key : 'c37';
    if (mode === 'country') return set({ mode, a: country });
    set({ mode, a: country, b: value.b !== country && world.byKey.get(value.b)?.kind === 'country' ? value.b : country === 'c115' ? 'c37' : 'c115' });
  };
  const select = (key: string, label: string, onPick: (k: string) => void, list: Place[], slot?: 'a' | 'b') =>
    <label className={`pp-field ${slot ? `pp-${slot}` : ''}`}><span>{slot && <i className={`pp-dot ${slot}`} />}{label}</span>
      <span className="pp-row"><select value={key} onChange={e => onPick(e.target.value)}>{list.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select>
        {onSee && <button type="button" className="pp-see" onClick={() => { const p = world.byKey.get(key); if (p) onSee(p); }}>See on map ↗</button>}</span></label>;
  return <div className={`place-picker ${compact ? 'compact' : ''}`} role="group" aria-label="Place">
    <div className="seg seg-small" role="radiogroup" aria-label="Scale">
      {MODES.filter(m => allowCompare || m.id !== 'compare').map(m => <button key={m.id} type="button" role="radio" aria-checked={value.mode === m.id} className={value.mode === m.id ? 'active' : ''} onClick={() => pickMode(m.id)}>{m.label}</button>)}
    </div>
    <div className="pp-fields">
      {value.mode === 'continent' && select(value.a, 'Continent', k => set({ a: k }), continents)}
      {(value.mode === 'country' || value.mode === 'compare') && select(value.a, value.mode === 'compare' ? 'Country A' : 'Country', k => set({ a: k, b: k === value.b ? value.a : value.b }), countries, value.mode === 'compare' ? 'a' : undefined)}
      {value.mode === 'compare' && select(value.b, 'Country B', k => set({ b: k }), countries.filter(c => c.key !== value.a), 'b')}
      {value.mode === 'world' && <p className="pp-note">{world.countries.length} countries and territories, added up.</p>}
    </div>
  </div>;
}
