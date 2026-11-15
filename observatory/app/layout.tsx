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
  description: 'Explore surface water observations for 266 countries and territories, satellite imagery, Bayesian projections through 2030, and a one-year Ridge regression experiment.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased selection:bg-lime-200/25">{children}</body></html>;
}
