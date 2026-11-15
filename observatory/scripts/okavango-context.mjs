// Preserve the project's Okavango observation record alongside the global assistant data.
// The archived local forecast is omitted because the live site's engine uses a different model.
import { writeFileSync } from 'node:fs';

const commit = '42304c3aab8ae0c6a35bcac395d7e271cbe904ea';
const source = `https://raw.githubusercontent.com/Asadgnc/edev-data/${commit}/data/assistant_context.json`;
const response = await fetch(source);
if (!response.ok) throw new Error(`Could not read case study (${response.status})`);
const data = await response.json();
const context = {
  source,
  area: data.area,
  background_facts: data.background_facts,
  nisar_2026: data.nisar_2026,
  optical_history: data.optical_history,
  jrc_occurrence_1984_2024: data.jrc_occurrence_1984_2024,
  drivers: data.drivers,
  data_quality: data.data_quality,
};
writeFileSync(new URL('../public/data/okavango-context.json', import.meta.url), JSON.stringify(context));
console.log(`Okavango observation context: ${JSON.stringify(context).length} bytes`);
