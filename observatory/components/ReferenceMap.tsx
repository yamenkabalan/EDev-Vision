'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { MapPhase } from './RadarMap';
import { DSWX_COLOURS } from '@/lib/dswx';

const dswxDate:Record<string,string>={'2026-06-26':'2026-06-26','2026-07-08':'2026-07-08','2026-07-20':'2026-07-18','2026-08-13':'2026-08-12','2026-08-25':'2026-08-24','2026-09-06':'2026-09-06','2026-09-18':'2026-09-17','2026-09-30':'2026-09-30','2026-10-12':'2026-10-11','2026-10-24':'2026-10-23'};
const bounds:L.LatLngBoundsExpression=[[-20,22],[-18.3,23.8]];
/** Longest wait for one date's tiles before the map reports ready anyway, so Play never stalls on a slow tile server. */
const TILE_TIMEOUT_MS=12000;
type Kind='dswx'|'nasa'|'viirs';
/*
  NASA draws DSWx "not water" in opaque white, which turns the map into a bright white panel. Each
  tile is redrawn on a canvas instead: white becomes transparent and the water classes get colours
  that read on the dark basemap. Only these exact palette entries change (GIBS serves a fixed
  palette PNG); anything else, such as snow/ice, keeps NASA's colour.
*/
const rgbKey=(r:number,g:number,b:number)=>(r<<16)|(g<<8)|b;
const DSWX_RECOLOUR=new Map<number,readonly number[]>([
  [rgbKey(255,255,255),[0,0,0,0]],
  [rgbKey(0,0,255),DSWX_COLOURS.open],
  [rgbKey(180,213,244),DSWX_COLOURS.partial],
  [rgbKey(175,175,175),DSWX_COLOURS.cloud],
]);
const DswxTiles=L.TileLayer.extend({
  createTile(this:L.TileLayer,coords:L.Coords,done:L.DoneCallback){
    const size=this.getTileSize(),canvas=document.createElement('canvas');canvas.width=size.x;canvas.height=size.y;
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{try{
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(img,0,0,size.x,size.y);
      const data=ctx.getImageData(0,0,size.x,size.y),p=data.data;
      for(let i=0;i<p.length;i+=4){if(!p[i+3])continue;const to=DSWX_RECOLOUR.get(rgbKey(p[i],p[i+1],p[i+2]));if(to){p[i]=to[0];p[i+1]=to[1];p[i+2]=to[2];p[i+3]=to[3];}}
      ctx.putImageData(data,0,0);done(undefined,canvas);
    }catch(e){done(e instanceof Error?e:new Error('DSWx tile could not be read'),canvas);}};
    img.onerror=()=>done(new Error('DSWx tile unavailable'),canvas);
    img.src=this.getTileUrl(coords);
    return canvas;
  }
}) as unknown as new (url:string,options?:L.TileLayerOptions)=>L.TileLayer;
const details:Record<Kind,{url:(date:string)=>string;title:string;note:string}>={
  dswx:{url:d=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OPERA_L3_Dynamic_Surface_Water_Extent-HLS/default/${dswxDate[d]||d}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`,title:'NASA OPERA surface water',note:'Optical open-water observation. Grey means cloud or no clear view, not a water detection.'},
  nasa:{url:d=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${d}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`,title:'NASA NISAR rendering',note:'NASA-rendered radar product; on some dates it covers only part of the area.'},
  viirs:{url:d=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,title:'NOAA-20 VIIRS true colour',note:'Satellite photo for context; clouds can hide the ground. It is not a water measurement.'}
};
export default function ReferenceMap({date,kind,opacity=.95,onPhase}:{date:string;kind:Kind;opacity?:number;onPhase?:(phase:MapPhase)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),shown=useRef<L.TileLayer[]>([]);
 const[failed,setFailed]=useState(false),[loading,setLoading]=useState(true);const meta=details[kind];
 const phaseRef=useRef(onPhase);useEffect(()=>{phaseRef.current=onPhase;},[onPhase]);
 const opacityRef=useRef(opacity);opacityRef.current=opacity;
 useEffect(()=>{shown.current.forEach(t=>t.setOpacity(opacity));},[opacity]);
 // Same darkened basemap as the radar map (.context-tile), so the page never flashes a white street map before the NASA tiles arrive.
 useEffect(()=>{if(!host.current)return;const m=L.map(host.current,{zoomControl:false,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false});map.current=m;L.control.zoom({position:'bottomright'}).addTo(m);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19,className:'context-tile'}).addTo(m);m.fitBounds(bounds,{padding:[14,14],animate:false});const resize=new ResizeObserver(()=>m.invalidateSize({pan:false}));resize.observe(host.current);return()=>{resize.disconnect();m.remove();map.current=null;shown.current=[]}},[]);
 useEffect(()=>{
  const m=map.current;if(!m)return;let current=true;setFailed(false);
  setLoading(true);phaseRef.current?.('loading');
  const options:L.TileLayerOptions={maxNativeZoom:kind==='dswx'?12:kind==='nasa'?13:9,opacity:opacityRef.current,crossOrigin:true,attribution:`NASA GIBS · ${meta.title}`};
  const tile:L.TileLayer=kind==='dswx'?new DswxTiles(meta.url(date),options):L.tileLayer(meta.url(date),options);
  // The previous date stays underneath until this one has drawn, then it is removed: no flash between frames.
  const finish=()=>{if(!current)return;clearTimeout(timer);shown.current.filter(t=>t!==tile).forEach(t=>t.remove());shown.current=[tile];setLoading(false);phaseRef.current?.('ready');};
  const timer=setTimeout(finish,TILE_TIMEOUT_MS);
  tile.on('tileerror',()=>{if(current)setFailed(true);});tile.once('load',finish);
  tile.addTo(m);shown.current.push(tile);
  return()=>{current=false;clearTimeout(timer);tile.off('load',finish);};
 },[date,kind,meta]);
 const shownDate=kind==='dswx'?dswxDate[date]||date:date;
 return <div className="reference-map-wrap"><div ref={host} className="reference-map" data-kind={kind} role="region" aria-label={`${meta.title} map for ${shownDate}`}/><div className="reference-map-label">{meta.title}<span>{shownDate}{loading?' · loading':''}</span></div><div className="reference-map-note">{failed?'Some NASA map tiles could not be reached.':meta.note}</div></div>;
}
