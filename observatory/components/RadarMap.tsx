'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DATA_URL, formatDate, loadBounds, loadHistoryBounds } from '@/lib/data';
export type MapPhase = 'loading' | 'ready' | 'error';
type Props = { dates: string[]; layer?: 'class'|'hh'|'rgb'; source?:'nisar'|'history'; opacity?: number; onPhase?: (phase:MapPhase)=>void; };
export default function RadarMap({dates,layer='class',source='nisar',opacity=.95,onPhase}:Props) {
  const host=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null), overlays=useRef<L.ImageOverlay[]>([]), fitted=useRef(false);
  const split=useRef(50); const [divider,setDivider]=useState(50), [phase,setPhase]=useState<MapPhase>('loading'), [error,setError]=useState(''), [retry,setRetry]=useState(0),[tileError,setTileError]=useState(false);
  const dateKey=dates.join('|'); const isCompare=dates.length===2; const label=(d:string)=>source==='history'?d:formatDate(d,true);
  const phaseRef=useRef(onPhase); useEffect(()=>{phaseRef.current=onPhase;},[onPhase]);
  const opacityRef=useRef(opacity); opacityRef.current=opacity;
  function clip(){if(!host.current)return;const cr=host.current.getBoundingClientRect(),cut=cr.left+cr.width*split.current/100;overlays.current.forEach((o,i)=>{const el=o.getElement();if(!el)return;if(overlays.current.length!==2){el.style.clipPath='none';return;}const er=el.getBoundingClientRect();el.style.clipPath=i===0?`inset(0 ${Math.max(0,Math.min(er.width,er.right-cut))}px 0 0)`:`inset(0 0 0 ${Math.max(0,Math.min(er.width,cut-er.left))}px)`;});}
  useEffect(()=>{
    if(!host.current)return;
    const m=L.map(host.current,{zoomControl:false,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,zoomSnap:.25,zoomDelta:.5,attributionControl:true});map.current=m;
    L.control.zoom({position:'bottomright'}).addTo(m);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19,className:'context-tile'}).on('tileerror',()=>setTileError(true)).addTo(m);
    m.on('move zoom resize',clip);
    const resize=new ResizeObserver(()=>{m.invalidateSize({pan:false});clip();});resize.observe(host.current);
    return()=>{resize.disconnect();m.remove();map.current=null;fitted.current=false;};
  },[]);
  useEffect(()=>{
    const m=map.current;if(!m)return;
    const controller=new AbortController();let current=true;const layers:L.ImageOverlay[]=[];const timers:ReturnType<typeof setTimeout>[]=[];
    setPhase('loading');phaseRef.current?.('loading');setError('');overlays.current.forEach(o=>o.remove());overlays.current=[];
    async function run(){
      try{
        const selected=dateKey.split('|');
        const infos=await Promise.all(selected.map(d=>source==='history'?loadHistoryBounds(d,controller.signal):loadBounds(d,controller.signal)));if(!current)return;
        const combined=L.latLngBounds(infos[0].bounds);infos.slice(1).forEach(b=>combined.extend(b.bounds));
        if(!fitted.current){m!.fitBounds(combined,{padding:[15,15],maxZoom:11,animate:false});fitted.current=true;}
        const loaded=infos.map((info,i)=>new Promise<void>((resolve,reject)=>{
          const url=source==='history'?`${DATA_URL}/history/${selected[i]}.webp`:`${DATA_URL}/${selected[i]}/${layer==='class'?'class':layer==='hh'?'hh':'rgb'}.webp`;
          const o=L.imageOverlay(url,info.bounds,{opacity:opacityRef.current,interactive:false,crossOrigin:'anonymous',zIndex:300+i});layers.push(o);overlays.current=layers;
          const timer=setTimeout(()=>reject(new Error('The raster request timed out.')),25000);timers.push(timer);
          o.once('load',()=>{clearTimeout(timer);if(current){clip();resolve();}});
          o.once('error',()=>{clearTimeout(timer);reject(new Error(`The ${source==='history'?'historical':layer==='hh'?'HH radar':layer==='rgb'?'radar colour':'classification'} layer for ${label(selected[i])} is unavailable.`));});o.addTo(m!);
        }));
        await Promise.all(loaded);if(!current)return;clip();setPhase('ready');phaseRef.current?.('ready');
      }catch(e){if(!current)return;layers.forEach(l=>l.remove());overlays.current=[];setPhase('error');phaseRef.current?.('error');setError(e instanceof Error?e.message:'Map data could not be loaded.');}
    }
    void run();return()=>{current=false;controller.abort();timers.forEach(clearTimeout);layers.forEach(o=>{o.off();o.remove();});};
    // A selection is identified by its dates and layer; opacity updates independently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[dateKey,layer,source,retry]);
  useEffect(()=>{overlays.current.forEach(o=>o.setOpacity(opacity));},[opacity]);
  useEffect(()=>{split.current=divider;clip();},[divider]);
  function drag(e:React.PointerEvent<HTMLButtonElement>){if(!host.current)return;const r=host.current.getBoundingClientRect();setDivider(Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100)));}
  return <div className={`radar-frame ${isCompare?'comparison-frame':''}`}>
    <div ref={host} className="radar-map" role="region" aria-label={isCompare?'Geographically aligned two-date radar comparison':'NISAR observation map'} />
    <div className="map-coordinates">OKAVANGO DELTA <span>BOTSWANA</span></div>
    <button className="map-reset" aria-label="Reset map to the observation footprint" onClick={()=>{if(overlays.current.length)map.current?.fitBounds(overlays.current[0].getBounds(),{padding:[15,15],animate:false});}}>⌖ <span>Reset view</span></button>
    {isCompare&&<><div className="compare-date left">A <strong>{label(dates[0])}</strong></div><div className="compare-date right">B <strong>{label(dates[1])}</strong></div><div className="swipe-line" style={{left:`${divider}%`}}><button className="swipe-handle" aria-label="Drag comparison divider" onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drag(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))drag(e);}} onPointerUp={e=>e.currentTarget.releasePointerCapture(e.pointerId)} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setDivider(p=>Math.max(2,Math.min(98,p+(e.key==='ArrowRight'?2:-2))));}}}>‹<span/>›</button></div></>}
    {phase!=='ready'&&<div className="map-state" role="status"><div>{phase==='loading'?<><span className="loading-orbit"/><strong>Reading the landscape</strong><p>Loading {isCompare?'both observations':'the selected observation'}…</p></>:<><strong>Observation unavailable</strong><p>{error}</p><button className="small-button" onClick={()=>setRetry(n=>n+1)}>Retry layer ↻</button></>}</div></div>}
    {tileError&&<div className="tile-warning">Background map is partially unavailable. Radar footprint remains georeferenced.</div>}
    {isCompare&&<label className="swipe-accessible">Comparison divider <input type="range" min="2" max="98" value={divider} onChange={e=>setDivider(+e.target.value)} aria-label="Comparison divider position"/></label>}
  </div>;
}
