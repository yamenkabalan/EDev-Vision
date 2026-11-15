'use client';
import { useEffect, useRef, useState } from 'react';

/** false brings back the three.js globe instead of the film. */
export const HERO_VIDEO_READY = true;

const base = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets`;
/**
 * Two cuts of the same 10 s flight: 16:9 for desktop, 9:16 for phones (same breakpoint as the CSS).
 * `#t=0.1` skips the first frame of pc_version.mp4, a stray blurred delta frame that would flash before the Earth.
 * Posters are the 0.1 s frame of each cut (generated from the videos, see scratch script posters.mjs).
 */
const FILM = { desktop: `${base}/pc_version.mp4#t=0.1`, mobile: `${base}/phone_version.mp4#t=0.1` };
/** If playback has not started by then (slow network), give up and show the poster with the hero text. */
const START_TIMEOUT_MS = 4000;

/**
 * loading  – source attached, waiting for the first frame (hero text hidden)
 * playing  – film is running (hero text hidden)
 * paused   – the whole hero left the viewport mid-film; frame is held, text is back
 * finished – film reached the end; border + text reveal
 * stopped  – no film at all (reduced motion, data saver, autoplay blocked, too slow); poster + text
 */
export type FilmPhase = 'loading' | 'playing' | 'paused' | 'finished' | 'stopped';

type Props = {
  reduced: boolean;
  onFailure: () => void;
  onPhase: (p: FilmPhase) => void;
  /** Increment to resume a paused film. */
  resumeSignal: number;
};

export default function HeroVideo({ reduced, onFailure, onPhase, resumeSignal }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const phaseRef = useRef<FilmPhase>('loading');
  const [phase, setPhaseState] = useState<FilmPhase>('loading');
  const [src, setSrc] = useState<string>();
  const report = useRef(onPhase);
  report.current = onPhase;
  const setPhase = (p: FilmPhase) => {
    if (phaseRef.current === p) return;
    phaseRef.current = p;
    setPhaseState(p);
    report.current(p);
  };

  // Giving up before the first frame is final: drop the source so the download ends, the poster stays.
  const stop = () => {
    const v = video.current;
    setPhase('stopped');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    setSrc(undefined);
  };

  // Pick the lightest file that still looks sharp. No video at all for reduced motion or data saver.
  useEffect(() => {
    const isMobile = matchMedia('(max-width:720px)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (reduced || conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || '')) { stop(); return; }
    if (phaseRef.current !== 'loading') return;
    setSrc(FILM[isMobile ? 'mobile' : 'desktop']);
    const t = setTimeout(() => { if (phaseRef.current === 'loading') stop(); }, START_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [reduced]);

  // Start once the source is attached. Blocked autoplay (e.g. iOS Low Power Mode) simply leaves the poster.
  useEffect(() => {
    const v = video.current;
    if (!v || !src) return;
    v.muted = true;
    v.playbackRate = 1.5;
    v.defaultPlaybackRate = 1.5;
    v.play().then(() => {
      if (phaseRef.current === 'loading') setPhase('playing');
      else if (phaseRef.current !== 'playing') v.pause();
    }).catch(() => { if (phaseRef.current === 'loading') stop(); });
  }, [src]);

  // If the whole hero leaves the viewport mid-film, hold the current frame (text comes back).
  // Scrolling only part of the way down keeps it playing.
  useEffect(() => {
    const section = host.current?.closest('section');
    if (!section) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) return;
      if (phaseRef.current === 'loading') stop();
      else if (phaseRef.current === 'playing') { video.current?.pause(); setPhase('paused'); }
    }, { threshold: 0 });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // "Resume the flight" button.
  useEffect(() => {
    const v = video.current;
    if (!resumeSignal || !v || phaseRef.current !== 'paused') return;
    v.playbackRate = 1.5;
    v.play().then(() => setPhase('playing')).catch(() => {});
  }, [resumeSignal]);

  const shown = phase === 'playing' || phase === 'paused' || phase === 'finished';

  return <div ref={host} className="hero-video" aria-hidden="true">
    <picture>
      <source media="(max-width:720px)" srcSet={`${base}/hero-poster-m.webp`} />
      <img className="hero-video-poster" src={`${base}/hero-poster.webp`} alt="" fetchPriority="high" decoding="async" />
    </picture>
    {src && <video ref={video} className="hero-video-media" src={src} muted playsInline preload="auto" disablePictureInPicture
      style={{ opacity: shown ? 1 : 0 }}
      onEnded={() => setPhase('finished')}
      onError={() => { if (phaseRef.current !== 'stopped') onFailure(); }} />}
  </div>;
}
