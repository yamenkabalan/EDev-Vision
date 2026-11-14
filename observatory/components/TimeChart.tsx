'use client';
import { formatArea, formatDate, segments, stamp, type Feed, type Metric } from '@/lib/data';
export default function TimeChart({feed,selected,onSelect}:{feed:Feed;selected:string;onSelect:(date:string)=>void}) {
  const {observations:rows,meta}=feed; if(!rows.length)return null;
  const left=56,right=978,top=24,bottom=210, first=stamp(rows[0].date), last=stamp(rows.at(-1)!.date);
  const max=Math.max(1,...rows.flatMap(r=>[r.open_water_km2??0,r.flooded_veg_km2??0]))*1.15;
  const x=(date:string)=>left+(stamp(date)-first)/Math.max(1,last-first)*(right-left), y=(value:number)=>bottom-value/max*(bottom-top);
  const keys:Metric[]=['open_water_km2','flooded_veg_km2'];
  return <div className="chart-scroll"><svg className="time-chart" viewBox="0 0 1000 250" role="group" aria-label="Open water and flooded vegetation by acquisition date. Select an observation to update the map.">
    {[0,.5,1].map(f=><g key={f}><line x1={left} x2={right} y1={y(max*f)} y2={y(max*f)} stroke="#263c34" strokeDasharray="3 6"/><text x={left-12} y={y(max*f)+4} textAnchor="end" fill="#8daca0" fontSize="11">{Math.round(max*f)}</text></g>)}
    <text x={left} y="12" fill="#78978a" fontSize="10">AREA / km²</text>
    {meta.gaps.filter(([a,b])=>stamp(a)<=last&&stamp(b)>=first).map(([a,b])=><g key={a}><rect x={Math.max(left,x(a))} width={Math.max(0,Math.min(right,x(b))-Math.max(left,x(a)))} y={top} height={bottom-top} fill="#c4b58b" opacity=".07"/><text x={(x(a)+x(b))/2} y="44" fill="#b8ae8f" textAnchor="middle" fontSize="9" letterSpacing="1">NO DATA</text></g>)}
    <line x1={x(selected)} x2={x(selected)} y1={top} y2={bottom} stroke="#d2e8a4" strokeOpacity=".45" strokeDasharray="3 5"/>
    {keys.map((key,k)=><g key={key} className={k?'chart-veg':'chart-water'}>{segments(rows,key,meta.gaps).map((part,i)=><path key={i} d={part.map((r,j)=>`${j?'L':'M'}${x(r.date)},${y(r[key]!)}`).join(' ')} fill="none" stroke={k?'#a9cc79':'#66bce2'} strokeWidth="2.5"/>)}{rows.filter(r=>r[key]!==null&&!meta.gaps.some(([a,b])=>r.date>=a&&r.date<=b)).map(r=><circle key={r.date} cx={x(r.date)} cy={y(r[key]!)} r={r.date===selected?6:3} fill={k?'#a9cc79':'#66bce2'} stroke="#12251e" strokeWidth="2"/>)}</g>)}
    {rows.map((r,i)=><g key={r.date} role="button" tabIndex={0} aria-label={`${formatDate(r.date,true)}. Open water ${formatArea(r.open_water_km2)}, flooded vegetation ${formatArea(r.flooded_veg_km2)} square kilometres.`} aria-pressed={r.date===selected} onClick={()=>onSelect(r.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.date);}}} className="chart-hit"><title>{formatDate(r.date,true)} · Open water {formatArea(r.open_water_km2)} km² · Flooded vegetation {formatArea(r.flooded_veg_km2)} km²</title><rect x={x(r.date)-17} y={top} width="34" height={bottom-top+30} fill="transparent"/>{(i%2===0||i===rows.length-1)&&<text x={x(r.date)} y={bottom+25} textAnchor="middle" fill={r.date===selected?'#d3e5b3':'#8daca0'} fontSize="11">{formatDate(r.date)}</text>}</g>)}
  </svg></div>;
}
