import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './theme-v2.css';
import './sections-v3.css';
export const metadata: Metadata = {
  title: 'RSynthesis AI — Okavango Flood Pulse',
  description: 'Old NASA data + AI = an estimate of the Okavango Delta’s future. NISAR radar, 41 years of Landsat water and our own projection to 2030.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased selection:bg-lime-200/25">{children}</body></html>;
}
