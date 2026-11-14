'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DATA_URL, formatDate, loadBounds, loadHistoryBounds } from '@/lib/data';
export type MapPhase = 'loading' | 'ready' | 'error';
type Props = { dates: string[]; layer?: 'class'|'hh'|'rgb'; source?:'nisar'|'history'; opacity?: number; onPhase?: (phase:MapPhase)=>void; };
/*
  Fades the edge of a full radar image (colour or HH) into the basemap instead of ending in a hard
  line. A small blurred copy of the image's own alpha becomes a CSS mask, so it follows the real
  footprint on every date and costs a few milliseconds. If the canvas is tainted or canvas filters
  are unsupported, the hard edge simply stays.
*/
const EDGE_MASK_PX=512, EDGE_BLUR_PX=10;
function softenEdge(img:HTMLImageElement|undefined){
  if(!img)return;
  try{
    const c=document.createElement('canvas');c.width=c.height=EDGE_MASK_PX;
    const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;
    ctx.filter=`blur(${EDGE_BLUR_PX}px)`;ctx.drawImage(img,0,0,EDGE_MASK_PX,EDGE_MASK_PX);
    const data=ctx.getImageData(0,0,EDGE_MASK_PX,EDGE_MASK_PX),p=data.data;
    // Blurred alpha is ~50% on the footprint edge: remap so the edge itself is 0 and full strength starts ~2 blur radii inside.
    for(let i=0;i<p.length;i+=4){p[i]=p[i+1]=p[i+2]=255;p[i+3]=Math.max(0,Math.min(255,(p[i+3]-128)*2));}
    ctx.putImageData(data,0,0);
    const mask=`url(${c.toDataURL()})`;
    for(const prefix of ['','-webkit-']){img.style.setProperty(`${prefix}mask-image`,mask);img.style.setProperty(`${prefix}mask-size`,'100% 100%');}
  }catch{/* cross-origin or unsupported: keep the hard edge */}
}
export default function RadarMap({dates,layer='class',source='nisar',opacity=.95,onPhase}:Props) {
  const host=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null), overlays=useRef<L.ImageOverlay[]>([]), fitted=useRef(false);
  const split=useRef(50); const [divider,setDivider]=useState(50), [phase,setPhase]=useState<MapPhase>('loading'), [error,setError]=useState(''), [retry,setRetry]=useState(0),[tileError,setTileError]=useState(false),[showing,setShowing]=useState(false);
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
    setPhase('loading');phaseRef.current?.('loading');setError('');
    // The images on screen stay until the new ones have loaded (new ones wait invisible), so stepping
    // through dates or pressing Play never flashes an empty map or the loading veil between frames.
    async function run(){
      try{
        const selected=dateKey.split('|');
        const infos=await Promise.all(selected.map(d=>source==='history'?loadHistoryBounds(d,controller.signal):loadBounds(d,controller.signal)));if(!current)return;
        const combined=L.latLngBounds(infos[0].bounds);infos.slice(1).forEach(b=>combined.extend(b.bounds));
        if(!fitted.current){m!.fitBounds(combined,{padding:[15,15],maxZoom:11,animate:false});fitted.current=true;}
        const soft=source==='nisar'&&(layer==='rgb'||layer==='hh');
        const loaded=infos.map((info,i)=>new Promise<void>((resolve,reject)=>{
          const url=source==='history'?`${DATA_URL}/history/${selected[i]}.webp`:`${DATA_URL}/${selected[i]}/${layer==='class'?'class':layer==='hh'?'hh':'rgb'}.webp`;
          const o=L.imageOverlay(url,info.bounds,{opacity:0,interactive:false,crossOrigin:'anonymous',zIndex:300+i,className:source==='nisar'&&layer==='rgb'?'radar-soft':''});layers.push(o);
          const timer=setTimeout(()=>reject(new Error('The raster request timed out.')),25000);timers.push(timer);
          o.once('load',()=>{clearTimeout(timer);if(current){if(soft)softenEdge(o.getElement());resolve();}});
          o.once('error',()=>{clearTimeout(timer);reject(new Error(`The ${source==='history'?'historical':layer==='hh'?'HH radar':layer==='rgb'?'radar colour':'classification'} layer for ${label(selected[i])} is unavailable.`));});o.addTo(m!);
        }));
        await Promise.all(loaded);if(!current)return;
        overlays.current.forEach(o=>o.remove());overlays.current=layers;layers.forEach(o=>o.setOpacity(opacityRef.current));
        clip();setShowing(true);setPhase('ready');phaseRef.current?.('ready');
      }catch(e){if(!current)return;layers.forEach(l=>l.remove());overlays.current.forEach(o=>o.remove());overlays.current=[];setShowing(false);setPhase('error');phaseRef.current?.('error');setError(e instanceof Error?e.message:'Map data could not be loaded.');}
    }
    // Layers that never made it on screen are dropped; the ones on screen stay for the next selection to replace.
    void run();return()=>{current=false;controller.abort();timers.forEach(clearTimeout);layers.forEach(o=>{if(!overlays.current.includes(o)){o.off();o.remove();}});};
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
    {phase==='loading'&&showing&&<div className="map-loading-chip" role="status"><span className="loading-orbit" aria-hidden="true"/>Loading {dates.map(label).join(' / ')}</div>}
    {(phase==='error'||phase==='loading'&&!showing)&&<div className="map-state" role="status"><div>{phase==='loading'?<><span className="loading-orbit"/><strong>Reading the landscape</strong><p>Loading {isCompare?'both observations':'the selected observation'}…</p></>:<><strong>Observation unavailable</strong><p>{error}</p><button className="small-button" onClick={()=>setRetry(n=>n+1)}>Retry layer ↻</button></>}</div></div>}
    {tileError&&<div className="tile-warning">Background map is partially unavailable. Radar footprint remains georeferenced.</div>}
    {isCompare&&<label className="swipe-accessible">Comparison divider <input type="range" min="2" max="98" value={divider} onChange={e=>setDivider(+e.target.value)} aria-label="Comparison divider position"/></label>}
  </div>;
}
