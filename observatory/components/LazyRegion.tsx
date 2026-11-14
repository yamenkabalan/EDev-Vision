'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mounts its children (usually a Leaflet map) only when the reader gets close. */
export default function LazyRegion({ children, label = 'Geographic view loads as you approach.' }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '350px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="lazy-region">{visible ? children : <div className="map-skeleton">{label}</div>}</div>;
}
