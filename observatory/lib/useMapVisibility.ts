'use client';
import { useEffect, useState, type RefObject } from 'react';

/** Initialise maps on first approach; defer tile updates when away or in a hidden tab. */
export function useMapVisibility(ref: RefObject<HTMLElement | null>) {
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let near = false;
    const update = () => {
      const visible = near && !document.hidden;
      setActive(visible);
      if (visible) setStarted(true);
    };
    const observer = new IntersectionObserver(([entry]) => { near = entry.isIntersecting; update(); }, { rootMargin: '200px 0px' });
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [ref]);
  return { started, active };
}
