'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const dswxDate:Record<string,string>={'2026-06-26':'2026-06-26','2026-07-08':'2026-07-08','2026-07-20':'2026-07-18','2026-08-13':'2026-08-12','2026-08-25':'2026-08-24','2026-09-06':'2026-09-06','2026-09-18':'2026-09-17','2026-09-30':'2026-09-30','2026-10-12':'2026-10-11','2026-10-24':'2026-10-23'};
const bounds:L.LatLngBoundsExpression=[[-20,22],[-18.3,23.8]];
type Kind='dswx'|'nasa'|'viirs';
const details:Record<Kind,{url:(date:string)=>string;title:string;note:string}>={
  dswx:{url:d=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OPERA_L3_Dynamic_Surface_Water_Extent-HLS/default/${dswxDate[d]||d}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`,title:'NASA OPERA surface water',note:'Optical open-water observation. Clouds and white pixels are not water detections.'},
  nasa:{url:d=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${d}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`,title:'NASA NISAR rendering',note:'NASA-rendered radar product, available from 13 Aug 2026; some tiles may be empty.'},
  viirs:{url:d=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,title:'NOAA-20 VIIRS true colour',note:'Satellite photo for context; clouds can hide the ground. It is not a water measurement.'}
};
export default function ReferenceMap({date,kind}:{date:string;kind:Kind}){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),tiles=useRef<L.TileLayer|null>(null);const[failed,setFailed]=useState(false);const meta=details[kind];
 useEffect(()=>{if(!host.current)return;const m=L.map(host.current,{zoomControl:false,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false});map.current=m;L.control.zoom({position:'bottomright'}).addTo(m);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(m);m.fitBounds(bounds,{padding:[14,14],animate:false});const resize=new ResizeObserver(()=>m.invalidateSize({pan:false}));resize.observe(host.current);return()=>{resize.disconnect();m.remove();map.current=null;tiles.current=null}},[]);
 useEffect(()=>{const m=map.current;if(!m)return;tiles.current?.remove();setFailed(false);if(kind==='nasa'&&date<'2026-08-13'){setFailed(true);return;}const url=meta.url(date);const tile=L.tileLayer(url,{maxNativeZoom:kind==='dswx'?12:kind==='nasa'?13:9,opacity:.95,className:kind==='dswx'?'reference-dswx':'',crossOrigin:true,attribution:`NASA GIBS · ${meta.title}`});tile.on('tileerror',()=>setFailed(true));tile.addTo(m);tiles.current=tile;return()=>{tile.off();tile.remove();if(tiles.current===tile)tiles.current=null}},[date,kind,meta]);
 return <div className="reference-map-wrap"><div ref={host} className="reference-map" role="region" aria-label={`${meta.title} map for ${date}`}/><div className="reference-map-label">{meta.title}<span>{date}</span></div><div className="reference-map-note">{failed?(kind==='nasa'?'NASA NISAR tiles begin on 13 Aug 2026.':'Some NASA map tiles could not be reached.'):meta.note}</div></div>;
}
