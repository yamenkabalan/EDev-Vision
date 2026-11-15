'use client';
import { Component, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { COPY } from '@/lib/copy';
import { useAssistant } from '@/lib/assistant';
import { SECTIONS } from '@/lib/sections';
import { DEFAULT_SELECTION, loadWorld, type Selection, type World } from '@/lib/world';
import type { RidgeResearch } from '@/lib/ridgeResearch';
import FactTicker from './FactTicker';
import AskWindow from './AskWindow';
import SectionRail from './SectionRail';
import WhatIs from './WhatIs';
import GlobalExplorer from './GlobalExplorer';
import WorldRadar from './WorldRadar';
import WorldCompare from './WorldCompare';
import WorldHistory from './WorldHistory';
import WorldGraphics from './WorldGraphics';
import WorldFuture from './WorldFuture';
import WorldSolutions from './WorldSolutions';
import AiSection from './AiSection';
import SourcesDoc from './SourcesDoc';
import HeroVideo, { HERO_VIDEO_READY, type FilmPhase } from './HeroVideo';
/** Stagger index for the hero text that leaves while the film plays and returns afterwards (see .film-item in globals.css). */
const fi=(i:number)=>({'--i':i}) as CSSProperties;
const Globe=dynamic(()=>import('./Globe'),{ssr:false});
const asset=(name:string)=>`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/${name}`;
class GraphicBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}> {
  state={failed:false}; static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
function Arrow({down=false}:{down?:boolean}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={down?{transform:'rotate(90deg)'}:undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5"/></svg>;}
function ChatIcon(){return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.4"/></svg>;}
export default function Experience({ ridge }: { ridge: RidgeResearch }){
  const reduced=!!useReducedMotion();const heroRef=useRef<HTMLElement>(null);
  const {scrollYProgress}=useScroll({target:heroRef,offset:['start start','end start']});
  const globeY=useTransform(scrollYProgress,[0,1],[0,-180]);const globeScale=useTransform(scrollYProgress,[0,1],[1,.82]);
  // One conversation for every chat surface: floating window and AI section.
  const chat=useAssistant();
  // World record (EC JRC / UNEP water + ERA5 + NOAA + UNEP SDG), shared by sections 02-08.
  const [world,setWorld]=useState<World|null>(null);
  useEffect(()=>{
    let live=true;
    const sections=Array.from(document.querySelectorAll('#global, #observatory, #compare, #history, #graphics, #future, #solutions'));
    if(!sections.length){loadWorld().then(w=>{if(live)setWorld(w);}).catch(()=>{});return()=>{live=false;};}
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      observer.disconnect();
      loadWorld().then(w=>{if(live)setWorld(w);}).catch(()=>{});
    },{rootMargin:'0px'});
    sections.forEach(section=>observer.observe(section));
    return()=>{live=false;observer.disconnect();};
  },[]);
  // The place chosen in one section follows the reader down the page.
  const [selection,setSelection]=useState<Selection>(DEFAULT_SELECTION);
  const [globeReady,setGlobeReady]=useState(false);
  const [videoFailed,setVideoFailed]=useState(false);const heroVideo=HERO_VIDEO_READY&&!videoFailed;
  const onVideoFailure=useCallback(()=>setVideoFailed(true),[]);
  const [filmPhase,setFilmPhase]=useState<FilmPhase>('loading'),[resumeSignal,setResumeSignal]=useState(0);
  // hide: film running, text away · show: film held or absent, text back · reveal: film ended, cinematic return
  const film=!heroVideo?'off':filmPhase==='loading'||filmPhase==='playing'?'hide':filmPhase==='finished'?'reveal':'show';
  const [askOpen,setAskOpen]=useState(false),[askSummon,setAskSummon]=useState(0);
  const openAsk=useCallback(()=>{setAskOpen(true);setAskSummon(n=>n+1);},[]),closeAsk=useCallback(()=>setAskOpen(false),[]);
  // Floating chat button: hidden over the hero, shown once the first screen has scrolled away.
  const [pastHero,setPastHero]=useState(false);
  useEffect(()=>{const el=heroRef.current;if(!el)return;const io=new IntersectionObserver(([e])=>setPastHero(!e.isIntersecting));io.observe(el);return()=>io.disconnect();},[]);
  const [activeSection,setActiveSection]=useState('');
  const inlineChat=activeSection==='ai';
  const onGlobeReady=useCallback(()=>setGlobeReady(true),[]),onGlobeFailure=useCallback(()=>setGlobeReady(false),[]);
  const fabVisible=pastHero&&!askOpen&&!inlineChat;
  return <>
    <a href="#what" className="skip-link">Skip to the content</a>
    <section className="hero-section" id="pulse" ref={heroRef} data-film={film}>
      <div className="hero-grid"/>
      {heroVideo?<motion.div className="hero-video-stage" style={reduced?undefined:{y:globeY}}><HeroVideo reduced={reduced} onFailure={onVideoFailure} onPhase={setFilmPhase} resumeSignal={resumeSignal}/></motion.div>:<motion.div className="orbital-stage" initial={reduced?false:{x:'65vw',scale:.75,opacity:.5}} animate={{x:0,scale:1,opacity:1}} transition={{duration:.85,ease:[.16,1,.3,1]}}><motion.div style={reduced?undefined:{y:globeY,scale:globeScale}} className="orbital-inner"><div className="earth-fallback" style={{backgroundImage:`url(${asset('earth.jpg')})`,opacity:globeReady?0:1}}/><GraphicBoundary onFailure={onGlobeFailure}><Globe reduced={reduced} onReady={onGlobeReady} onFailure={onGlobeFailure}/></GraphicBoundary><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/></motion.div></motion.div>}
      <motion.header className="site-header" initial={{opacity:0,y:reduced?0:-36}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.2,duration:.7}}>
        <a className="brand" href="#pulse" aria-label="RSynthesis AI home"><span className="brand-symbol">◉</span><span className="brand-name"><span>RSYNTHESIS <b>AI</b></span><small className="brand-credit">by EDev-Vision</small></span></a>
        <button type="button" className="ask-ai-button" aria-haspopup="dialog" aria-expanded={askOpen} onClick={openAsk}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>Ask AI<span className="signal-dot"/></button>
        <nav aria-label="Main navigation">{[['The Pulse','pulse'],['Global water','global'],['Radar','observatory'],['Future','future']].map(([label,id],i)=><motion.a key={id} href={`#${id}`} initial={{opacity:0,y:reduced?0:-10}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.45+i*.08}}>{label}</motion.a>)}</nav>
        </motion.header>
      {heroVideo&&<div className="hero-scrim" aria-hidden="true"/>}
      <div className="hero-content" inert={film==='hide'}>
        <div className="film-item" style={fi(0)}><motion.div className="fact-slot" initial={{opacity:0,y:reduced?0:15}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.7,duration:.7}}><FactTicker reduced={reduced}/></motion.div></div>
        <h1>{['Estimate','the future'].map((line,i)=><motion.span key={line} className="headline-line" initial={{opacity:0,y:reduced?0:35}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.85+i*.14,duration:.85}}><span className="film-item" style={fi(1+i)}>{line}{i===1&&<> <em>of life.</em></>}</span></motion.span>)}</h1>
        <div className="film-item" style={fi(3)}><motion.div initial={{opacity:0,y:reduced?0:15}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:1.1,duration:.7}}><p className="hero-equation" aria-label="Water equals future"><span>Water</span><b aria-hidden="true">=</b><em>Future</em></p><a className="primary-button" href="#global">Explore Earth’s water <Arrow/></a></motion.div></div>
      </div>
      <div className="orbital-caption film-item" style={fi(4)}>{film==='show'&&filmPhase==='paused'&&<button type="button" className="film-resume" onClick={()=>setResumeSignal(n=>n+1)}>▶ Resume the flight</button>}<span>FIELD OF VIEW / PLANET EARTH</span><small>{heroVideo?'Decorative AI-generated sequence · not mission data':'Decorative Earth imagery · three.js example assets'}</small></div>
      <div className="hero-bottom film-item" style={fi(5)} inert={film==='hide'}><span>01 / 266 COUNTRIES · ONE PLANET</span><a href="#what">FROM ORBIT TO OBSERVATION <Arrow down/></a><span>1984 — 2030</span></div>
    </section>
    <div className="page-shell">
    <main className="page-main">
      <WhatIs ridge={ridge}/>
      <GlobalExplorer/>
      <WorldRadar world={world} selection={selection} onSelect={setSelection}/>
      <WorldCompare world={world} selection={selection} onSelect={setSelection}/>
      <WorldHistory world={world} selection={selection} onSelect={setSelection}/>
      <WorldGraphics world={world} selection={selection} onSelect={setSelection}/>
      <WorldFuture world={world} selection={selection} onSelect={setSelection}/>
      <WorldSolutions world={world} selection={selection} onSelect={setSelection}/>
      <AiSection chat={chat}/>
      <SourcesDoc ridge={ridge}/>
    <footer className="wrap site-footer"><a className="brand" href="#pulse"><span className="brand-symbol">◉</span><span className="brand-name"><span>RSYNTHESIS <b>AI</b></span><small className="brand-credit">by EDev-Vision</small></span></a><p>NASA Space Apps Challenge 2026<br/>Dancing with the SARs</p><p>Radar and water layers: NASA–ISRO NISAR, NASA OPERA, LANCE, GPM and VIIRS via NASA GIBS.<br/>Global water: EC JRC / Google Global Surface Water · UNEP SDG 6.6.1 · ERA5 (Copernicus, via Our World in Data) · NOAA ONI · Natural Earth.<br/><a href="https://github.com/mrdoob/three.js/blob/dev/examples/textures/planets/earth_atmos_2048.jpg" target="_blank" rel="noreferrer">Decorative Earth: three.js example texture ↗</a></p><a href="#pulse" className="back-top" aria-label="Back to top">↑</a></footer>
    </main>
    <SectionRail sections={SECTIONS} onActive={setActiveSection} mobileAction={pastHero&&!inlineChat?<button type="button" className="rail-chat" aria-label={COPY.chat.fab} aria-expanded={askOpen} aria-haspopup="dialog" onClick={openAsk}><ChatIcon/></button>:null}/>
    </div>
    <AskWindow open={askOpen} summon={askSummon} onClose={closeAsk} chat={chat}/>
    <button type="button" className="v2-ask-fab" data-visible={fabVisible} inert={!fabVisible} aria-label={COPY.chat.fab} title={COPY.chat.fab} aria-haspopup="dialog" onClick={openAsk}>
      <ChatIcon/>
    </button>
  </>;
}

