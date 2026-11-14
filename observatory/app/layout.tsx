import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './theme-v2.css';
export const metadata: Metadata = {
  title: 'RSynthesis AI — Okavango Flood Pulse',
  description: 'An orbital perspective on a living wetland. Explore real NISAR observations of open water and flooded vegetation in the Okavango Delta.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased selection:bg-lime-200/25">{children}</body></html>;
}
