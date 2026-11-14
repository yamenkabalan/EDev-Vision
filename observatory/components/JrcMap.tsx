'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DATA_URL, formatArea, getJSON } from '@/lib/data';
type JrcBounds = { bounds:[[number,number],[number,number]]; source:string; meaning:string; caveat:string; stats:{ever_water_km2:number;water_25pct_km2:number;water_75pct_km2:number} };
export default function JrcMap(){
  const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null);
  const [info,setInfo]=useState<JrcBounds|null>(null),[error,setError]=useState(false);
  useEffect(()=>{if(!host.current)return;const m=L.map(host.current,{zoomControl:true,scrollWheelZoom:false,zoomSnap:.25,zoomAnimation:false,fadeAnimation:false});map.current=m;L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',className:'context-tile',maxZoom:19}).addTo(m);const controller=new AbortController();
    getJSON(`${DATA_URL}/jrc/bounds.json`,controller.signal).then(raw=>{const b=raw as JrcBounds;if(!Array.isArray(b.bounds)||!b.stats)throw Error('Invalid JRC bounds');m.fitBounds(b.bounds,{padding:[18,18],animate:false});const overlay=L.imageOverlay(`${DATA_URL}/jrc/occurrence.webp`,b.bounds,{opacity:.9});overlay.on('load',()=>setInfo(b));overlay.on('error',()=>setError(true));overlay.addTo(m);}).catch(()=>{if(!controller.signal.aborted)setError(true)});
    return()=>{controller.abort();m.remove();map.current=null};
  },[]);
  return <div className="jrc-workspace"><div className="jrc-map" ref={host} role="region" aria-label="JRC historical open water occurrence map"/>{!info&&<div className="jrc-state">{error?'JRC layer unavailable.':'Loading JRC historical layer…'}</div>}<div className="jrc-context"><div className="eyebrow">JRC GLOBAL SURFACE WATER · 1984–2024</div><h3>Where water returned.</h3><p>Occurrence: share of cloud free Landsat observations showing open water. Darker blue means more frequent observations.</p>{info&&<div className="jrc-values"><span>Ever observed <strong>{formatArea(info.stats.ever_water_km2)} km²</strong></span><span>Water ≥25% <strong>{formatArea(info.stats.water_25pct_km2)} km²</strong></span><span>Water ≥75% <strong>{formatArea(info.stats.water_75pct_km2)} km²</strong></span></div>}<p>Optical open water only. This layer does not measure water beneath vegetation or match a 2026 NISAR acquisition.</p><a href={`${DATA_URL}/jrc/bounds.json`} target="_blank" rel="noreferrer">View source and bounds ↗</a></div></div>;
}
