import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import './theme-v2.css';
import './sections-v3.css';
import './global-explorer.css';
import './world.css';
export const metadata: Metadata = {
  title: 'RSynthesis AI — Estimate the future of life',
  description: 'Explore how inland surface water changed across 266 countries and territories from 1984 to 2018, see the whole Earth through NISAR radar and six more NASA and JRC views, and project any country’s water to 2030 with our Bayesian engine.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased selection:bg-lime-200/25">{children}</body></html>;
}
