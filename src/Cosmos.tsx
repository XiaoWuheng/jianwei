import {useEffect,useRef} from 'react';
import {ArrowUpRight,BrainCircuit,Globe2,Orbit,ScanLine} from 'lucide-react';

// The ambient star field stays stable as the pointer crosses the scene.
// It stays outside the accessibility tree and never intercepts the product's controls.
export default function Cosmos(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  let w=0,h=0,raf=0,last=0,elapsed=0,visible=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const stars=Array.from({length:190},(_,i)=>({x:((i*73.193+17)%997)/997,y:((i*39.719+41)%991)/991,r:i%31===0?1.6:.35+(i%5)*.17,phase:i*1.79}));
  function resize(){w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.7);canvas!.width=w*dpr;canvas!.height=h*dpr;ctx!.setTransform(dpr,0,0,dpr,0,0);if(reduced.matches)draw(0);}
  function draw(time:number){
   if(!ctx)return;const dt=Math.min(time-last,40);last=time;if(!reduced.matches)elapsed+=dt;
   ctx.clearRect(0,0,w,h);
   const nebula=ctx.createRadialGradient(w*.53,h*.37,0,w*.53,h*.37,w*.52);nebula.addColorStop(0,'rgba(17,77,106,.14)');nebula.addColorStop(.45,'rgba(12,39,68,.11)');nebula.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=nebula;ctx.fillRect(0,0,w,h);
   for(const s of stars){const x=s.x*w,y=s.y*h,alpha=.2+.45*(.5+.5*Math.sin(elapsed*.00045+s.phase));ctx.fillStyle=`rgba(159,215,235,${alpha})`;ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill();
    if(s.r>1.5){ctx.strokeStyle=`rgba(151,231,255,${alpha*.45})`;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();}
   }
   if(visible&&!reduced.matches)raf=requestAnimationFrame(draw);
  }
  const visibility=()=>{visible=!document.hidden;cancelAnimationFrame(raf);if(visible){last=performance.now();raf=requestAnimationFrame(draw);}};
  const motion=()=>{cancelAnimationFrame(raf);draw(performance.now());};
  resize();if(!reduced.matches)raf=requestAnimationFrame(draw);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);};
 },[]);
 return <div className="cosmos" aria-hidden="true"><canvas ref={ref}/><div className="cosmos-horizon"/><div className="distant-planet planet-one"/><div className="distant-planet planet-two"/><div className="space-vignette"/></div>;
}
export function NeuralCore({busy=false,online=false,onCapture,onMemory,onResearch,onBlueprint}:{busy?:boolean;online?:boolean;onCapture:()=>void;onMemory:()=>void;onResearch:()=>void;onBlueprint:()=>void}){
 const ref=useRef<HTMLCanvasElement>(null),wrap=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const canvas=ref.current,element=wrap.current;if(!canvas||!element)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,angle=0,last=0,seen=true;
  const mouse={x:0,y:0,tx:0,ty:0};
  const points=Array.from({length:240},(_,i)=>{const y=1-(i/239)*2,r=Math.sqrt(1-y*y),phi=i*Math.PI*(3-Math.sqrt(5));return {x:Math.cos(phi)*r,y,z:Math.sin(phi)*r};});
  function frame(time:number){
   if(!ctx||!canvas)return;const dt=Math.min(time-last,40);last=time;if(!reduced.matches)angle+=dt*(busy?.00015:.000045);
   mouse.x+=(mouse.tx-mouse.x)*.04;mouse.y+=(mouse.ty-mouse.y)*.04;ctx.clearRect(0,0,500,500);
   const projected=points.map(p=>{const x=p.x*Math.cos(angle)-p.z*Math.sin(angle),z=p.x*Math.sin(angle)+p.z*Math.cos(angle);return {x:250+(x+mouse.x*.09)*142*(1+z*.07),y:250+(p.y+mouse.y*.07)*142*(1+z*.07),z};});
   for(let i=0;i<projected.length;i++){const p=projected[i];ctx.fillStyle=`rgba(123,235,255,${.15+(p.z+1)*.25})`;ctx.beginPath();ctx.arc(p.x,p.y,p.z>.5?1.45:.7,0,Math.PI*2);ctx.fill();for(let j=i+1;j<Math.min(i+22,projected.length);j++){const q=projected[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<37&&d>12&&p.z>-.4&&q.z>-.4){ctx.strokeStyle=`rgba(94,202,234,${(1-d/40)*.28})`;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}}
   if(seen&&!document.hidden&&!reduced.matches)raf=requestAnimationFrame(frame);
  }
  const observer=new IntersectionObserver(entries=>{seen=entries[0].isIntersecting;cancelAnimationFrame(raf);if(seen){last=performance.now();raf=requestAnimationFrame(frame);}});observer.observe(element);
  const move=(e:PointerEvent)=>{const r=element.getBoundingClientRect();mouse.tx=(e.clientX-r.left-r.width/2)/r.width;mouse.ty=(e.clientY-r.top-r.height/2)/r.height;};
  const leave=()=>{mouse.tx=0;mouse.ty=0;};
  const wake=()=>{cancelAnimationFrame(raf);if(!document.hidden)raf=requestAnimationFrame(frame);};
  element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);};
 },[busy]);
 return <div ref={wrap} className={'neural-core '+(busy?'thinking':'')}>
  <svg className="core-hud" viewBox="0 0 600 600" fill="none" aria-hidden="true"><defs><radialGradient id="core-glow"><stop stopColor="#8ceeff" stopOpacity=".08"/><stop offset=".6" stopColor="#38a6d9" stopOpacity=".025"/><stop offset="1" stopColor="#061521" stopOpacity="0"/></radialGradient><linearGradient id="arc-glow"><stop stopColor="#baf6ff"/><stop offset="1" stopColor="#196a9e" stopOpacity=".2"/></linearGradient></defs><circle cx="300" cy="300" r="275" fill="url(#core-glow)"/><g className="hud-rotate-slow"><circle cx="300" cy="300" r="263" stroke="#37637b" strokeWidth=".5" strokeDasharray="1 7"/><path d="M300 37A263 263 0 0 1 552 224M300 563A263 263 0 0 1 48 376" stroke="url(#arc-glow)" strokeWidth="2"/><circle cx="300" cy="37" r="3" fill="#c3faff"/><circle cx="300" cy="563" r="2" fill="#a9ebff"/></g><circle cx="300" cy="300" r="246" stroke="#35617b" strokeWidth=".6"/><g className="hud-rotate-reverse"><circle cx="300" cy="300" r="229" stroke="#518da3" strokeWidth="6" strokeDasharray="38 7 2 7 2 7 61 240" opacity=".45"/><circle cx="300" cy="300" r="219" stroke="#8ae9fa" strokeWidth="1" strokeDasharray="157 100 45 75 10 200"/></g><g className="hud-rotate"><circle cx="300" cy="300" r="203" stroke="#95ecfa" strokeWidth="1.5" strokeDasharray="190 150 9 15 25 230"/><circle cx="300" cy="300" r="195" stroke="#346d88" strokeWidth=".6" strokeDasharray="3 5"/></g><circle cx="300" cy="300" r="179" stroke="#77d9ee" strokeOpacity=".25"/><path d="M88 300h28m368 0h28M300 88v28m0 368v28" stroke="#82dfef" strokeOpacity=".6"/><ellipse cx="300" cy="300" rx="289" ry="72" transform="rotate(-26 300 300)" stroke="#487d9d" strokeOpacity=".5" strokeWidth=".65"/><ellipse cx="300" cy="300" rx="282" ry="80" transform="rotate(29 300 300)" stroke="#487d9d" strokeOpacity=".3" strokeWidth=".65"/><g className="core-crosshairs" stroke="#a2f5ff"><path d="M161 167v-7h15M424 160h15v7M161 433v7h15M424 440h15v-7" strokeWidth="1"/></g></svg>
  <canvas className="core-globe" ref={ref} width="500" height="500" aria-hidden="true"/>
  <button className="core-center" onClick={onCapture} aria-label="捕捉一个新想法"><span className="core-identifier">J I A N W E I</span><strong>思维中枢</strong><span className="core-live"><i/>{busy?'正在推演':online?'等待你的灵感':'等待连接'}</span><small>点击 · 写下一个念头<ArrowUpRight size={10}/></small></button>
  <button className="orbital-control orbit-memory" onClick={onMemory}><span><BrainCircuit size={17}/></span><b>长期记忆</b><small>MEMORY</small></button>
  <button className="orbital-control orbit-think" onClick={onCapture}><span><Orbit size={18}/></span><b>拓展方向</b><small>EXPLORE</small></button>
  <button className="orbital-control orbit-research" onClick={onResearch}><span><Globe2 size={17}/></span><b>全域检索</b><small>RESEARCH</small></button>
  <button className="orbital-control orbit-blueprint" onClick={onBlueprint}><span><ScanLine size={17}/></span><b>行动计划</b><small>BLUEPRINT</small></button>
 </div>;
}
