import {useRef,useState,type PointerEvent} from 'react';
import {ArrowUpRight,Focus,GitBranch,Minus,Plus,RotateCcw} from 'lucide-react';
import type {Ideation,Direction} from './types';
export default function MindGraph({analysis,selected,onSelect,onExpand}:{analysis:Ideation;selected:string;onSelect:(id:string)=>void;onExpand:(d:Direction)=>void}){
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
 const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 const nodes=analysis.directions.map((d,i)=>{const angle=(-90+i*360/analysis.directions.length)*Math.PI/180;return {d,x:450+Math.cos(angle)*295,y:325+Math.sin(angle)*212};});
 const start=(e:PointerEvent<HTMLDivElement>)=>{if((e.target as HTMLElement).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(drag.current)setPan({x:drag.current.px+e.clientX-drag.current.x,y:drag.current.py+e.clientY-drag.current.y});};
 const direction=analysis.directions.find(d=>d.id===selected);
 return <div className="mind-graph">
  <div className="graph-toolbar"><div><span className="hud-label">THOUGHT CONSTELLATION</span><h3>一个念头的可能性</h3></div><div className="graph-controls"><button onClick={()=>setZoom(v=>Math.max(.65,v-.15))} aria-label="缩小星图"><Minus size={15}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(v=>Math.min(1.7,v+.15))} aria-label="放大星图"><Plus size={15}/></button><button onClick={()=>{setZoom(1);setPan({x:0,y:0});}} aria-label="重置星图"><Focus size={16}/></button></div></div>
  <div className="graph-viewport" onPointerDown={start} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
   <div className="graph-plane" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
    <svg viewBox="0 0 900 650" preserveAspectRatio="none" fill="none" aria-hidden="true"><defs><radialGradient id="thought-nebula"><stop stopColor="#5ddff6" stopOpacity=".08"/><stop offset="1" stopColor="#147499" stopOpacity="0"/></radialGradient></defs><ellipse cx="450" cy="325" rx="350" ry="260" fill="url(#thought-nebula)"/><ellipse cx="450" cy="325" rx="285" ry="210" stroke="#417d94" strokeOpacity=".2" strokeDasharray="2 8"/><ellipse cx="450" cy="325" rx="390" ry="270" stroke="#417d94" strokeOpacity=".12"/>{nodes.map(({d,x,y})=><g key={d.id} className={selected===d.id?'graph-edge selected':'graph-edge'}><path d={`M450 325 Q${450+(x-450)*.1} ${y} ${x} ${y}`}/><circle r="2.5"><animateMotion dur={selected===d.id?'3s':'7s'} repeatCount="indefinite" path={`M450 325 Q${450+(x-450)*.1} ${y} ${x} ${y}`}/></circle></g>)}</svg>
    <button className={'graph-seed '+(!selected?'selected':'')} style={{left:'50%',top:'50%'}} onClick={()=>onSelect('')}><span className="seed-halo"/><span className="seed-label">最初的那个念头</span><b>{analysis.title}</b><small>{analysis.intentType}</small></button>
    {nodes.map(({d,x,y},i)=><button key={d.id} className={'direction-node '+(selected===d.id?'selected':'')} style={{left:`${x/9}%`,top:`${y/6.5}%`}} onClick={()=>onSelect(d.id)}><span className="node-star"><i/></span><span className="node-number">{String(i+1).padStart(2,'0')}</span><b>{d.title}</b><small>{selected===d.id?'正在查看这个方向':'点击展开'}</small></button>)}
   </div>
   <span className="graph-gesture">拖动空白处移动 · 点击节点展开</span>
  </div>
  {direction?<div className="direction-detail"><div className="direction-detail-head"><span><GitBranch size={15}/>探索方向</span><button onClick={()=>onSelect('')} aria-label="回到核心念头"><RotateCcw size={14}/></button></div><h3>{direction.title}</h3><p>{direction.description}</p><div className="direction-value"><b>可能带来的价值</b><span>{direction.value}</span></div><div className="first-experiment"><span>可以先这样试</span><p>{direction.firstExperiment}</p></div>{direction.assumptions.length>0&&<p className="direction-assumption">待验证：{direction.assumptions.join('；')}</p>}<button className="expand-direction" onClick={()=>onExpand(direction)}>沿这个方向继续聊<ArrowUpRight size={16}/></button></div>:<div className="graph-core-detail"><span className="hud-label">CORE UNDERSTANDING</span><p>{analysis.understanding}</p><small>以上是推演方向，尚未代表已经验证的结论。</small></div>}
 </div>;
}
