'use client';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { change, DATA_URL, formatArea, formatDate, inGap, loadBounds, loadFeed, validDate, type Feed } from '@/lib/data';
import { COPY, type LayerId } from '@/lib/copy';
import { driverTable, yearlySeries } from '@/lib/yearly';
import { DSWX_COLOURS } from '@/lib/dswx';
import { useAssistant, type ChatContext } from '@/lib/assistant';
import { loadFuture, type FutureDoc } from '@/lib/future';
import { SECTIONS, sectionNumber } from '@/lib/sections';
import LayerStrip from './LayerStrip';
import YearlyBox from './YearlyBox';
import Popover from './Popover';
import TimeChart from './TimeChart';
import HistoricalGauge from './HistoricalGauge';
import FactTicker from './FactTicker';
import AskWindow from './AskWindow';
import LazyRegion from './LazyRegion';
import SectionRail from './SectionRail';
import WhatIs from './WhatIs';
import GraphicsSection from './GraphicsSection';
import FutureSection from './FutureSection';
import SolutionsSection from './SolutionsSection';
import AiSection from './AiSection';
import SourcesDoc from './SourcesDoc';
import type { MapPhase } from './RadarMap';
import HeroVideo, { HERO_VIDEO_READY, type FilmPhase } from './HeroVideo';
/** Stagger index for the hero text that leaves while the film plays and returns afterwards (see .film-item in globals.css). */
const fi=(i:number)=>({'--i':i}) as CSSProperties;
const Globe=dynamic(()=>import('./Globe'),{ssr:false});
const RadarMap=dynamic(()=>import('./RadarMap'),{ssr:false,loading:()=> <div className="map-skeleton">Preparing the geographic view…</div>});
const JrcMap=dynamic(()=>import('./JrcMap'),{ssr:false});
const ReferenceMap=dynamic(()=>import('./ReferenceMap'),{ssr:false});
const asset=(name:string)=>`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/${name}`;
class GraphicBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}> {
  state={failed:false}; static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
function Arrow({down=false}:{down?:boolean}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={down?{transform:'rotate(90deg)'}:undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5"/></svg>;}
export default function Experience(){
  const reduced=!!useReducedMotion();const heroRef=useRef<HTMLElement>(null);
  const {scrollYProgress}=useScroll({target:heroRef,offset:['start start','end start']});
  const globeY=useTransform(scrollYProgress,[0,1],[0,-180]);const globeScale=useTransform(scrollYProgress,[0,1],[1,.82]);
  const [feed,setFeed]=useState<Feed|null>(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[date,setDate]=useState(''),[before,setBefore]=useState(''),[after,setAfter]=useState(''),[layer,setLayer]=useState<'class'|'hh'|'rgb'|'dswx'|'nasa'|'viirs'>('class'),[view,setView]=useState<'nisar'|'history'>('nisar'),[compareView,setCompareView]=useState<'nisar'|'history'>('nisar'),[historyRows,setHistoryRows]=useState<{year:number;water_km2:number;low_coverage:boolean}[]>([]),[story,setStory]=useState<Record<string,any>>({}),[opacity,setOpacity]=useState(.95),[playing,setPlaying]=useState(false),[mapPhase,setMapPhase]=useState<MapPhase>('loading');
  const onPhase=useCallback((phase:MapPhase)=>setMapPhase(phase),[]);
  // One conversation for every chat surface: floating window, Future side panel, AI section.
  const chat=useAssistant();
  // RSynthesis engine output (pipeline/future.py): projection to 2030 and its probability maps.
  const [future,setFuture]=useState<FutureDoc|null>(null),[futureFailed,setFutureFailed]=useState(false),[futureRefresh,setFutureRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();setFutureFailed(false);loadFuture(controller.signal).then(f=>{if(!controller.signal.aborted)setFuture(f);}).catch(()=>{if(!controller.signal.aborted)setFutureFailed(true);});return()=>controller.abort();},[futureRefresh]);
  const [globeReady,setGlobeReady]=useState(false);
  const [videoFailed,setVideoFailed]=useState(false);const heroVideo=HERO_VIDEO_READY&&!videoFailed;
  const onVideoFailure=useCallback(()=>setVideoFailed(true),[]);
  const [filmPhase,setFilmPhase]=useState<FilmPhase>('loading'),[resumeSignal,setResumeSignal]=useState(0);
  // hide: film running, text away · show: film held or absent, text back · reveal: film ended, cinematic return
  const film=!heroVideo?'off':filmPhase==='loading'||filmPhase==='playing'?'hide':filmPhase==='finished'?'reveal':'show';
  const [askOpen,setAskOpen]=useState(false),[askSummon,setAskSummon]=useState(0),[askPrefill,setAskPrefill]=useState('');
  // openAsk is also an onClick handler (header pill): it ignores its argument and clears any prefill.
  const openAsk=useCallback(()=>{setAskPrefill('');setAskOpen(true);setAskSummon(n=>n+1);},[]),closeAsk=useCallback(()=>setAskOpen(false),[]);
  const askAbout=useCallback((question:string)=>{setAskPrefill(question);setAskOpen(true);setAskSummon(n=>n+1);},[]);
  // Floating chat button: hidden over the hero, shown once the first screen has scrolled away.
  const [pastHero,setPastHero]=useState(false);
  useEffect(()=>{const el=heroRef.current;if(!el)return;const io=new IntersectionObserver(([e])=>setPastHero(!e.isIntersecting));io.observe(el);return()=>io.disconnect();},[]);
  // The Future and AI sections have their own chat: the floating button steps aside while one is on screen.
  const [activeSection,setActiveSection]=useState('');
  const inlineChat=activeSection==='future'||activeSection==='ai';
  // Yearly box: selected year (null = latest full-coverage year), lazy history load, last NISAR date for returning from Landsat history.
  const [year,setYear]=useState<number|null>(null),[historyWanted,setHistoryWanted]=useState(false),[historyFailed,setHistoryFailed]=useState(false),[nisarDate,setNisarDate]=useState('');
  const needHistory=useCallback(()=>setHistoryWanted(true),[]);
  const onGlobeReady=useCallback(()=>setGlobeReady(true),[]),onGlobeFailure=useCallback(()=>setGlobeReady(false),[]);
  useEffect(()=>{const controller=new AbortController();setError('');setFeed(null);setPlaying(false);loadFeed(controller.signal).then(f=>{if(controller.signal.aborted)return;setFeed(f);setDate(f.meta.dates.includes('2026-07-08')?'2026-07-08':f.meta.dates[0]||'');setBefore(f.meta.dates.includes('2026-07-08')?'2026-07-08':f.meta.dates[0]||'');setAfter(f.meta.dates.includes('2026-09-06')?'2026-09-06':f.meta.dates.at(-1)||'');}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'The data feed could not be reached.');});return()=>controller.abort();},[refresh]);
  useEffect(()=>{if(mapPhase==='error')setPlaying(false);},[mapPhase]);
  useEffect(()=>{if(view!=='history'&&compareView!=='history'&&!historyWanted||historyRows.length)return;const controller=new AbortController();setHistoryFailed(false);fetch(`${DATA_URL}/history.json`,{signal:controller.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Historical years unavailable');return r.json()}).then(v=>{if(!Array.isArray(v.years))throw Error('Invalid history');setHistoryRows(v.years)}).catch(()=>{if(!controller.signal.aborted)setHistoryFailed(true)});return()=>controller.abort()},[view,compareView,historyWanted,historyRows.length]);
  useEffect(()=>{if(view==='nisar'&&validDate(date))setNisarDate(date);},[view,date]);
  useEffect(()=>{if(view==='history'&&/^\d{4}$/.test(date))setYear(+date);},[view,date]);
  useEffect(()=>{const controller=new AbortController();fetch(`${DATA_URL}/story.json`,{signal:controller.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Story context unavailable');return r.json()}).then(v=>{if(v.years&&typeof v.years==='object')setStory(v)}).catch(()=>{});return()=>controller.abort()},[]);
  useEffect(()=>{if(!playing||!feed||mapPhase!=='ready')return;const available=view==='history'?historyRows.map(r=>String(r.year)):feed.meta.dates.filter(d=>!inGap(d,feed.meta.gaps));const id=setTimeout(()=>setDate(available[(available.indexOf(date)+1)%available.length]),850);return()=>clearTimeout(id);},[playing,feed,date,mapPhase,view,historyRows]);
  // Warm the next radar images for the layer on screen. crossOrigin matches the map overlay, so the browser reuses the download.
  useEffect(()=>{if(!feed||!date||view!=='nisar'||(layer!=='class'&&layer!=='rgb'&&layer!=='hh'))return;const index=feed.meta.dates.indexOf(date);const preload=()=>{for(const d of [feed.meta.dates[index+1],feed.meta.dates[index+2],feed.meta.dates[index-1]])if(d){const image=new Image();image.crossOrigin='anonymous';image.src=`${DATA_URL}/${d}/${layer}.webp`;void loadBounds(d).catch(()=>{});}};const id=setTimeout(preload,400);return()=>clearTimeout(id);},[feed,date,layer,view]);
  const current=feed?.observations.find(r=>r.date===date),a=feed?.observations.find(r=>r.date===before),b=feed?.observations.find(r=>r.date===after),historical=historyRows.find(r=>String(r.year)===date);
  const comparisonAHistory=historyRows.find(r=>String(r.year)===before),comparisonBHistory=historyRows.find(r=>String(r.year)===after);
    const quality=current?.quality||'Quality unspecified';
  const select=(d:string)=>{setPlaying(false);setDate(d);};
  const reveal={initial:{opacity:0,y:reduced?0:22},whileInView:{opacity:1,y:0},viewport:{once:true,amount:.15},transition:{duration:reduced?0:.7}};
  const dateOptions=(view==='history'?historyRows.map(r=><option key={r.year} value={r.year}>{r.year}{r.low_coverage?' · limited looks':''}</option>):feed?.meta.dates.map(d=><option key={d} value={d}>{formatDate(d,true)}</option>));
  const compareDateOptions=(compareView==='history'?historyRows.map(r=><option key={r.year} value={String(r.year)}>{r.year}{r.low_coverage?' · limited looks':''}</option>):feed?.meta.dates.map(d=><option key={d} value={d}>{formatDate(d,true)}</option>));
  const deltaLabel=(v:number|null)=>v===null?'Unavailable':`${v>0?'+':''}${formatArea(Math.abs(v))==='Unavailable'?'':v<0?'−':''}${formatArea(Math.abs(v))} km²`;
  // ---- layer strip, stats column, yearly box and chat context ----
  const storyYears=useMemo(()=>Object.keys(story.years||{}).map(Number).filter(Number.isInteger),[story]);
  const series=useMemo(()=>historyRows.length?yearlySeries(historyRows,storyYears.length?Math.max(...storyYears):undefined):null,[historyRows,storyYears]);
  const drivers=useMemo(()=>driverTable(story),[story]);
  const latestYear=series?[...series.points].reverse().find(p=>p.water!==null&&!p.partial)?.year??null:null;
  const shownYear=year??latestYear;
  const activeLayer:LayerId=view==='history'?'history':layer;
  // NASA GIBS now serves its NISAR rendering for every acquisition date (checked 14 Nov 2026), so no layer is date-limited.
  const available:Record<LayerId,boolean>={class:true,rgb:true,viirs:true,dswx:true,history:true,hh:true,nasa:true};
  const productLine=feed?COPY.layers.tech.product(feed.meta.product,feed.meta.frequency,feed.meta.pixel_m):'';
  const extraTech:Partial<Record<LayerId,string[]>>=feed?{class:[productLine],rgb:[productLine],hh:[productLine,...(feed.meta.db_stretch?[COPY.layers.tech.stretch(...feed.meta.db_stretch)]:[])]}:{};
  const chooseLayer=(id:LayerId)=>{
    setPlaying(false);
    if(id==='history'){const target=shownYear!==null&&historyRows.some(r=>r.year===shownYear)?shownYear:historyRows.length?historyRows[historyRows.length-1].year:2025;setView('history');setLayer('class');setDate(String(target));return;}
    // Coming back from Landsat history: restore the last radar date instead of keeping a year as the date.
    if(view==='history')setDate(nisarDate||feed?.meta.dates[0]||'');
    setView('nisar');setLayer(id);
  };
  const chooseYear=(y:number)=>{setYear(y);if(view==='history'&&historyRows.some(r=>r.year===y))select(String(y));};
  const qualityTag=view==='history'?(historical?.low_coverage?'LIMITED LOOKS':'LANDSAT / OPTICAL'):quality;
  const qualityHelp=view==='history'?(historical?.low_coverage?COPY.stats.qualityHelp.LIMITED:COPY.stats.qualityHelp.LANDSAT):quality==='PROVISIONAL'||quality==='VALIDATED'?COPY.stats.qualityHelp[quality]:COPY.stats.qualityHelp.UNKNOWN;
  const chatContext:ChatContext={date:nisarDate||undefined,year:shownYear??undefined,view};
  const chatContextLabel=COPY.chat.context(nisarDate?formatDate(nisarDate,true):null,shownYear);
  const fabVisible=pastHero&&!askOpen&&!inlineChat;
  return <>
    <a href="#what" className="skip-link">Skip to the content</a>
    <section className="hero-section" id="pulse" ref={heroRef} data-film={film}>
      <div className="hero-grid"/>
      {heroVideo?<motion.div className="hero-video-stage" style={reduced?undefined:{y:globeY}}><HeroVideo reduced={reduced} onFailure={onVideoFailure} onPhase={setFilmPhase} resumeSignal={resumeSignal}/></motion.div>:<motion.div className="orbital-stage" initial={reduced?false:{x:'65vw',scale:.75,opacity:.5}} animate={{x:0,scale:1,opacity:1}} transition={{duration:.85,ease:[.16,1,.3,1]}}><motion.div style={reduced?undefined:{y:globeY,scale:globeScale}} className="orbital-inner"><div className="earth-fallback" style={{backgroundImage:`url(${asset('earth.jpg')})`,opacity:globeReady?0:1}}/><GraphicBoundary onFailure={onGlobeFailure}><Globe reduced={reduced} onReady={onGlobeReady} onFailure={onGlobeFailure}/></GraphicBoundary><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/></motion.div></motion.div>}
      <motion.header className="site-header" initial={{opacity:0,y:reduced?0:-36}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.2,duration:.7}}>
        <a className="brand" href="#pulse" aria-label="RSynthesis AI home"><span className="brand-symbol">◉</span><span className="brand-name"><span>RSYNTHESIS <b>AI</b></span><small className="brand-credit">by EDev-Vision</small></span></a>
        <button type="button" className="ask-ai-button" aria-haspopup="dialog" aria-expanded={askOpen} onClick={openAsk}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>Ask AI about Okavango<span className="signal-dot"/></button>
        <nav aria-label="Main navigation">{[['The Pulse','pulse'],['Observatory','observatory'],['Compare','compare'],['History','history']].map(([label,id],i)=><motion.a key={id} href={`#${id}`} initial={{opacity:0,y:reduced?0:-10}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.45+i*.08}}>{label}</motion.a>)}</nav>
        </motion.header>
      {heroVideo&&<div className="hero-scrim" aria-hidden="true"/>}
      <div className="hero-content" inert={film==='hide'}>
        <div className="film-item" style={fi(0)}><motion.div className="fact-slot" initial={{opacity:0,y:reduced?0:15}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.7,duration:.7}}><FactTicker reduced={reduced}/></motion.div></div>
        <h1>{['Today Okavango','Tomorrow'].map((line,i)=><motion.span key={line} className="headline-line" initial={{opacity:0,y:reduced?0:35}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:.85+i*.14,duration:.85}}><span className="film-item" style={fi(1+i)}>{line}{i===1&&<> <em>Earth.</em></>}</span></motion.span>)}</h1>
        <div className="film-item" style={fi(3)}><motion.div initial={{opacity:0,y:reduced?0:15}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:1.1,duration:.7}}><p className="hero-equation" aria-label="Water equals future"><span>Water</span><b aria-hidden="true">=</b><em>Future</em></p><a className="primary-button" href="#observatory">Explore the flood pulse <Arrow/></a></motion.div></div>
      </div>
      <div className="orbital-caption film-item" style={fi(4)}>{film==='show'&&filmPhase==='paused'&&<button type="button" className="film-resume" onClick={()=>setResumeSignal(n=>n+1)}>▶ Resume the flight</button>}<span>FIELD OF VIEW / SOUTHERN AFRICA</span><small>{heroVideo?'Decorative AI-generated sequence · not mission data':'Decorative Earth imagery · three.js example assets'}</small></div>
      <div className="hero-bottom film-item" style={fi(5)} inert={film==='hide'}><span>01 / OKAVANGO DELTA, BOTSWANA</span><a href="#what">FROM ORBIT TO OBSERVATION <Arrow down/></a><span>19.3° S &nbsp; 22.9° E</span></div>
    </section>
    <div className="page-shell">
    <main className="page-main">
      <WhatIs future={future}/>
      <section className="observatory-section" id="observatory"><div className="wrap">
        <motion.div {...reveal} className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('observatory')}</span> ALL-IN-ONE RADAR</div><h2>Seven views of the delta.<br/><em>One map.</em></h2></div><div className={`feed-badge ${error?'failed':feed?'connected':''}`} role="status"><span/>{error?'Feed unavailable':feed?`${feed.observations.length} observations loaded`:'Connecting to the data feed'}</div></motion.div>
        {!feed?<div className="feed-placeholder" role="status"><span className="loading-orbit"/><h3>{error?'The data feed is unavailable.':'Listening to the landscape.'}</h3><p>{error||'Loading published NISAR acquisitions and measurements.'}</p>{error&&<button className="small-button" onClick={()=>setRefresh(n=>n+1)}>Retry connection ↻</button>}</div>:!feed.observations.length?<div className="feed-placeholder"><h3>No acquisitions published yet.</h3><p>The feed is reachable. Observations will appear when the data team publishes them.</p><button className="small-button" onClick={()=>setRefresh(n=>n+1)}>Refresh feed ↻</button></div>:<>
          <div className="observatory-workspace">
            <LayerStrip active={activeLayer} view={view} available={available} onSelect={chooseLayer} legend={feed.meta.legend} extraTech={extraTech}/>
            <div className="map-and-stats v2-map-row"><div className="main-map-container"><button className="map-play" disabled={mapPhase==='error'} aria-pressed={playing} onClick={()=>setPlaying(p=>!p)}>{playing?'Ⅱ Pause':'▷ Play'}</button>{view==='nisar'&&inGap(date,feed.meta.gaps)?<div className="map-skeleton">No data — no acquisition in this interval.</div>:<LazyRegion>{view==='nisar'&&['dswx','nasa','viirs'].includes(layer)?<ReferenceMap date={date} kind={layer as 'dswx'|'nasa'|'viirs'} opacity={opacity} onPhase={onPhase}/>:<RadarMap dates={[date]} source={view} layer={layer as 'class'|'rgb'|'hh'} opacity={opacity} onPhase={onPhase}/>}</LazyRegion>}</div><aside className="observation-stats v2-stats"><label htmlFor="acquisition-date" className="eyebrow">{view==='history'?'HISTORICAL YEAR':'ACQUISITION DATE'}</label><select id="acquisition-date" value={date} onChange={e=>select(e.target.value)}>{dateOptions}</select>
              <Popover inline label={COPY.stats.qualityLabel(qualityTag)} title={qualityHelp} className="v2-quality" triggerClassName={`quality-tag ${quality==='VALIDATED'&&view!=='history'?'validated':''}`} trigger={qualityTag}><p>{qualityHelp}</p></Popover>
              <div className="metric water"><span><i/>{COPY.stats.openWater}</span><strong>{formatArea(view==='history'?historical?.water_km2:current?.open_water_km2)}</strong><small>{view==='history'?COPY.stats.unitHistory:COPY.stats.unitNisar}</small><p className="v2-metric-help">{view==='history'?COPY.stats.openWaterHistoryHelp:COPY.stats.openWaterHelp}</p></div>
              <div className="metric vegetation"><span><i/>{COPY.stats.floodedVeg}</span><strong>{view==='history'?'—':formatArea(current?.flooded_veg_km2)}</strong><small>{view==='history'?COPY.stats.notMeasured:COPY.stats.unitNisar}</small><p className="v2-metric-help">{view==='history'?COPY.stats.floodedVegHistoryHelp:COPY.stats.floodedVegHelp}</p></div>
              <p className="stats-note">{view==='history'?COPY.stats.footprintHistory:COPY.stats.footprint(formatArea(current?.valid_km2))} {COPY.stats.associations}</p>
            </aside></div>
            <div className="map-bottom"><div className="legend">{view==='history'?<><span><i style={{background:'#6baed6'}}/>Seasonal open water</span><span><i style={{background:'#08519c'}}/>Permanent open water</span></>:layer==='class'?feed.meta.legend.map(l=><span key={l.class}><i style={{background:`rgb(${l.color.slice(0,3).join(',')})`}}/>{l.label}</span>):layer==='rgb'?<span><i style={{background:'linear-gradient(90deg,#d85b42,#65b885,#527fe0)'}}/>HH / HV radar composite · display composite, not water class</span>:layer==='dswx'?<>{([['Open water',DSWX_COLOURS.open],['Partial surface water',DSWX_COLOURS.partial],['Cloud / no clear view',DSWX_COLOURS.cloud]] as const).map(([name,c])=><span key={name}><i style={{background:`rgba(${c[0]},${c[1]},${c[2]},${c[3]/255})`}}/>{name}</span>)}</>:layer==='viirs'?<span>True-colour satellite photo · context, not a water measurement</span>:layer==='nasa'?<span>NASA&apos;s own rendering of NISAR · not processed by us</span>:<span><i className="gray-swatch"/>HH backscatter · {feed.meta.db_stretch ? `fixed ${feed.meta.db_stretch[0]} to ${feed.meta.db_stretch[1]} dB stretch` : 'display stretch unspecified'}</span>}</div><label className="opacity-control">Opacity <input aria-label="Overlay opacity" type="range" min="15" max="100" value={Math.round(opacity*100)} onChange={e=>setOpacity(+e.target.value/100)}/><b>{Math.round(opacity*100)}%</b></label></div>
            <div className="acquisition-strip"><div className="strip-heading"><span>{view==='history'?'LANDSAT HISTORY / 1984–2025':'2026 / ACQUISITION TIMELINE'}</span><strong>{playing?'Playing observations':'Select an observation'}</strong></div><div className="strip-scroll"><div className="strip-track"><div className="strip-progress" style={{width:`calc((100% - 65px) * ${(view==='history'?historyRows.findIndex(r=>String(r.year)===date):feed.meta.dates.indexOf(date))/Math.max(1,(view==='history'?historyRows.length:feed.meta.dates.length)-1)})`}}/>{(view==='history'?historyRows.map(r=>String(r.year)):feed.meta.dates).map(d=><button key={d} className={`strip-date ${date===d?'selected':''}`} onClick={()=>select(d)} aria-label={`Show ${view==='history'?d:formatDate(d,true)}`} aria-current={date===d?'step':undefined}><i/><span>{view==='history'?d:formatDate(d)}</span></button>)}</div></div><div className="strip-foot"><span>{view==='history'?'1984 — 2025':'26 Jun — 24 Oct 2026'}</span><span>{view==='history'?'Annual open-water context':'No data · 27 Jul – 10 Aug'}</span></div></div>
            <details className="chart-disclosure"><summary>View measured curves <span>Open water / flooded vegetation ↗</span></summary><TimeChart feed={feed} selected={date} onSelect={select}/></details>
          </div>
          <div className="provenance-line"><span>NASA–ISRO NISAR / ASF DAAC</span><span>Track {feed.meta.geometry.track} · Frame {feed.meta.geometry.frame} · {feed.meta.geometry.pass}</span><span>One image footprint · Not the entire delta</span></div>
          {feed.meta.despeckle?.applied&&<p className="processing-note">{feed.meta.despeckle.note}</p>}
        </>}
      </div></section>
      <section className="compare-section wrap" id="compare"><motion.div {...reveal} className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('compare')}</span> COMPARE</div><h2>Same place.<br/><em>A shifting story.</em></h2></div><p className="section-description">Two acquisitions, geographically aligned.<br/>Drag the divider to follow the change.</p></motion.div>
        {feed&&before&&after?<div className="comparison-workspace"><div className="compare-source-switch" role="group" aria-label="Comparison source"><button aria-pressed={compareView==='nisar'} className={compareView==='nisar'?'active':''} onClick={()=>{setCompareView('nisar');setBefore('2026-07-08');setAfter('2026-09-06')}}>NISAR 2026</button><button aria-pressed={compareView==='history'} className={compareView==='history'?'active':''} onClick={()=>{setCompareView('history');setBefore('2013');setAfter('2019')}}>Landsat history (1984–2025)</button></div>{compareView==='history'&&!historyRows.length?<div className="compare-history-loading" role="status">Loading 42 annual Landsat observations…</div>:<><div className="compare-selects"><label><span className="compare-letter">A</span><span>First {compareView==='history'?'year':'observation'}</span><select aria-label="First comparison date" value={before} onChange={e=>setBefore(e.target.value)}>{compareDateOptions}</select></label><div className="compare-link">↔</div><label><span className="compare-letter">B</span><span>Second {compareView==='history'?'year':'observation'}</span><select aria-label="Second comparison date" value={after} onChange={e=>setAfter(e.target.value)}>{compareDateOptions}</select></label></div><div className="compare-visual"><LazyRegion><RadarMap dates={[before,after]} source={compareView}/></LazyRegion><HistoricalGauge/></div><div className="comparison-summary"><span>CHANGE FROM A TO B</span><div><i className="water-key"/> Open water <strong>{compareView==='history'?deltaLabel(comparisonAHistory&&comparisonBHistory?comparisonBHistory.water_km2-comparisonAHistory.water_km2:null):deltaLabel(change(a?.open_water_km2??null,b?.open_water_km2??null))}</strong></div><div><i className="veg-key"/> Flooded vegetation <strong>{compareView==='history'?'Not measured':deltaLabel(change(a?.flooded_veg_km2??null,b?.flooded_veg_km2??null))}</strong></div><small>{compareView==='history'?'Annual Landsat open-water area · limited-look years are flagged':'NISAR '+(a?.quality||'Quality unspecified')+' / '+(b?.quality||'Quality unspecified')}</small></div></>}</div>:<div className="feed-placeholder"><h3>Comparison awaits the data feed.</h3><p>Both published observations are required.</p></div>}
      </section>
      <section className="history-section" id="history"><div className="wrap">
        <motion.div {...reveal} className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('history')}</span> HISTORY</div><h2>Forty-one years of water,<br/><em>seen from orbit.</em></h2></div><p className="section-description">Every year since 1984 from Landsat, with the rain, river flow, El Niño and heat that went with it.</p></motion.div>
        <YearlyBox series={series} failed={historyFailed} drivers={drivers} story={story} year={shownYear} onYear={chooseYear} onAsk={y=>{setYear(y);askAbout(COPY.yearly.askPrompt(y));}} onNeed={needHistory}/>
        <div className="jrc-block"><div className="eyebrow">WHERE WATER RETURNS · JRC 1984–2024</div><h3>How often each place held water.</h3><LazyRegion><JrcMap/></LazyRegion></div>
        <div className="evidence-note">NISAR classifications are threshold-based indicators within one radar footprint. Historical Landsat data measures annual open water and is a different observation. <a href="https://github.com/Asadgnc/edev-data" target="_blank" rel="noreferrer">Data & methodology ↗</a> <a href="https://nisar-docs.asf.alaska.edu/gcov/" target="_blank" rel="noreferrer">NISAR GCOV ↗</a></div>
      </div></section>
      <GraphicsSection feed={feed} history={historyRows} future={future} futureFailed={futureFailed} drivers={drivers} onNeed={needHistory}/>
      <FutureSection future={future} failed={futureFailed} chat={chat} context={chatContext} onRetry={()=>setFutureRefresh(n=>n+1)}/>
      <SolutionsSection future={future} drivers={drivers} history={historyRows}/>
      <AiSection chat={chat} context={chatContext} contextLabel={chatContextLabel}/>
      <SourcesDoc future={future}/>
    <footer className="wrap site-footer"><a className="brand" href="#pulse"><span className="brand-symbol">◉</span><span className="brand-name"><span>RSYNTHESIS <b>AI</b></span><small className="brand-credit">by EDev-Vision</small></span></a><p>NASA Space Apps Challenge 2026<br/>Dancing with the SARs</p><p>NISAR data: NASA / JPL-Caltech & ISRO, via ASF DAAC.<br/><a href="https://github.com/mrdoob/three.js/blob/dev/examples/textures/planets/earth_atmos_2048.jpg" target="_blank" rel="noreferrer">Decorative Earth: three.js example texture ↗</a></p><a href="#pulse" className="back-top" aria-label="Back to top">↑</a></footer>
    </main>
    <SectionRail sections={SECTIONS} onActive={setActiveSection}/>
    </div>
    <AskWindow open={askOpen} summon={askSummon} onClose={closeAsk} prefill={askPrefill} context={chatContext} contextLabel={chatContextLabel} chat={chat}/>
    <button type="button" className="v2-ask-fab" data-visible={fabVisible} inert={!fabVisible} aria-label={COPY.chat.fab} title={COPY.chat.fab} aria-haspopup="dialog" onClick={openAsk}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.4"/></svg>
    </button>
  </>;
}

