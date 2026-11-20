import {useEffect,useRef} from 'react';
import './ui/pointer.css';

export type PointerMode='dust'|'scan'|'off';
export const pointerModeKey='jianwei-pointer-effect';
const canvasSize=360;
const quietAreas='.system-intro,.topbar,.holo-fragment,.holo-reader,.modal-shade,.thought-input,input,textarea,select,[contenteditable]';

export function savedPointerMode():PointerMode{
 try{
  const value=localStorage.getItem(pointerModeKey);
  return value==='scan'||value==='off'?value:'dust';
 }catch{return 'dust';}
}

type PointerSample={x:number;y:number;at:number;energy:number;dy:number};
const half=canvasSize/2;

function paintDust(ctx:CanvasRenderingContext2D,s:PointerSample,elapsed:number,fade:number){
 const radius=118+s.energy*24, spacing=12;
 const centerX=Math.floor(s.x/spacing),centerY=Math.floor(s.y/spacing),extent=Math.ceil(radius/spacing)+1;
 const drift=elapsed*.002;
 ctx.globalCompositeOperation='lighter';
 for(let row=centerY-extent;row<=centerY+extent;row++){
  for(let col=centerX-extent;col<=centerX+extent;col++){
   const seed=(Math.sin(col*63.351+row*187.27)*34917.81)%1;
   const dx=col*spacing+seed*7-s.x,dy=row*spacing+Math.sin(seed*82)*6-s.y;
   const distance=Math.hypot(dx,dy);
   if(distance>=radius||distance<1)continue;
   const weight=1-distance/radius;
   const direction=Math.atan2(dy,dx)+weight*(.48+s.energy*.6+drift);
   const turbulent=Math.sin(direction*3+seed*10+drift)*weight*8;
   const push=weight*(19+19*s.energy)+turbulent;
   const x=half+Math.cos(direction)*(distance+push),y=half+Math.sin(direction)*(distance+push);
   const glow=fade*weight*(.34+Math.abs(seed)*.57);
   const star=Math.abs(seed)>.83;
   const color=star?'255,220,163':seed<0?'109,188,255':'112,248,232';
   const width=star?2.2:1.05+Math.abs(seed)*.45;
   ctx.fillStyle=`rgba(${color},${glow*.12})`;ctx.fillRect(x-2,y-2,width+4,width+4);
   ctx.fillStyle=`rgba(${color},${glow})`;ctx.fillRect(x,y,width,width);
   if(star&&weight>.35){
    const sparkle=(2+weight*6)*(.7+.3*Math.sin(elapsed*.018+seed*23));
    ctx.fillStyle=`rgba(215,249,255,${glow*.65})`;
    ctx.fillRect(x-sparkle,y+.5,sparkle*2,1);ctx.fillRect(x+.5,y-sparkle,1,sparkle*2);
   }
  }
 }
 ctx.globalCompositeOperation='source-over';
}

function paintScan(ctx:CanvasRenderingContext2D,s:PointerSample,elapsed:number,fade:number,availableWidth:number){
 const side=s.x>availableWidth-130?-1:1;
 ctx.save();
 ctx.translate(half+side*69,half-13);
 ctx.rotate(-.18+s.dy*.12);
 ctx.transform(1,0,-.26,1,0,0);
 ctx.globalAlpha=fade;

 // An open, faceted projection with a travelling inspection beam.
 const plane=new Path2D('M-47 -28H34L47 -14V27H-33L-47 13Z');
 const tint=ctx.createLinearGradient(-46,-28,45,27);
 tint.addColorStop(0,'rgba(51,185,208,.17)');tint.addColorStop(.6,'rgba(15,52,78,.38)');tint.addColorStop(1,'rgba(168,121,233,.22)');
 ctx.fillStyle=tint;ctx.fill(plane);ctx.strokeStyle='rgba(122,225,246,.64)';ctx.lineWidth=.85;ctx.stroke(plane);

 ctx.save();ctx.clip(plane);
 ctx.strokeStyle='rgba(150,214,239,.26)';ctx.lineWidth=.55;
 ctx.beginPath();
 for(let x=-48;x<=48;x+=11){ctx.moveTo(x,-29);ctx.lineTo(x,29);}
 for(let y=-28;y<=28;y+=8){ctx.moveTo(-49,y);ctx.lineTo(49,y);}
 ctx.stroke();
 const beam=((s.at+elapsed)*.13)%73-37;
 const glow=ctx.createLinearGradient(0,beam-13,0,beam+4);
 glow.addColorStop(0,'rgba(111,221,255,0)');glow.addColorStop(.78,'rgba(111,221,255,.36)');glow.addColorStop(1,'rgba(111,221,255,0)');
 ctx.fillStyle=glow;ctx.fillRect(-48,beam-13,96,17);
 ctx.fillStyle='rgba(222,250,255,.94)';ctx.fillRect(-48,beam,96,1.2);
 ctx.restore();

 ctx.strokeStyle='rgba(230,251,255,.98)';ctx.lineWidth=1.75;
 ctx.stroke(new Path2D('M-47 -14V-28H-23M29 27H47V13'));
 ctx.strokeStyle='rgba(232,195,255,.8)';ctx.lineWidth=1;
 ctx.stroke(new Path2D('M-48 34H-21L-15 28M34 -35H47M51 -35H56'));
 ctx.restore();
}

export function PointerEffects({mode,preview=false}:{mode:PointerMode;preview?:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');
  if(!canvas||!ctx||mode==='off')return;
  const area=preview?canvas.parentElement:window;
  if(!area)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let sample:PointerSample|null=null;
  let frame=0;

  const clear=()=>{cancelAnimationFrame(frame);frame=0;sample=null;delete canvas.dataset.active;};
  const resize=()=>{
   clear();
   const ratio=Math.min(devicePixelRatio||1,2);
   canvas.width=canvasSize*ratio;canvas.height=canvasSize*ratio;
   ctx.setTransform(ratio,0,0,ratio,0,0);
  };
  const draw=(now:number)=>{
   frame=0;
   if(!sample)return;
   const elapsed=Math.max(0,now-sample.at);
   const fade=1-Math.min(1,Math.max(0,elapsed-140)/450);
   if(fade<=0){clear();return;}
   canvas.style.transform=`translate3d(${sample.x-half}px,${sample.y-half}px,0)`;
   ctx.clearRect(0,0,canvasSize,canvasSize);
   if(mode==='dust')paintDust(ctx,sample,elapsed,fade);
   else paintScan(ctx,sample,elapsed,fade,preview?(canvas.parentElement?.clientWidth||innerWidth):innerWidth);
   canvas.dataset.active=mode;
   frame=requestAnimationFrame(draw);
  };
  const move=(event:Event)=>{
   const pointer=event as PointerEvent;
   const target=pointer.target;
   if(reduce.matches||pointer.pointerType!=='mouse'||pointer.buttons!==0||!(target instanceof Element)||
      (!preview&&(target.closest(quietAreas)||document.querySelector('.is-booting')))){
    if(sample)clear();
    return;
   }
   const rect=preview?canvas.parentElement?.getBoundingClientRect():null;
   const x=pointer.clientX-(rect?.left||0),y=pointer.clientY-(rect?.top||0),at=performance.now();
   const deltaX=sample?x-sample.x:0,deltaY=sample?y-sample.y:0;
   const distance=Math.hypot(deltaX,deltaY);
   const energy=sample?Math.min(1,distance/Math.max(8,at-sample.at)):.2;
   sample={x,y,at,energy,dy:deltaY/Math.max(1,distance)};
   if(!frame)frame=requestAnimationFrame(draw);
  };
  const leave=(event:Event)=>{if(preview||!(event as PointerEvent).relatedTarget)clear();};

  resize();
  const leaveEvent=preview?'pointerleave':'pointerout';
  area.addEventListener('pointermove',move,{passive:true});
  area.addEventListener(leaveEvent,leave);
  area.addEventListener('pointerdown',clear,{passive:true});
  window.addEventListener('blur',clear);
  window.addEventListener('resize',resize);
  window.addEventListener('hashchange',clear);
  document.addEventListener('visibilitychange',clear);
  reduce.addEventListener('change',clear);
  return()=>{
   clear();
   area.removeEventListener('pointermove',move);
   area.removeEventListener(leaveEvent,leave);
   area.removeEventListener('pointerdown',clear);
   window.removeEventListener('blur',clear);
   window.removeEventListener('resize',resize);
   window.removeEventListener('hashchange',clear);
   document.removeEventListener('visibilitychange',clear);
   reduce.removeEventListener('change',clear);
  };
 },[mode,preview]);
 return <canvas ref={ref} className={'pointer-effect'+(preview?' pointer-effect-preview':'')} aria-hidden="true"/>;
}

export function PointerEffectSetting({mode,onChange}:{mode:PointerMode;onChange:(mode:PointerMode)=>void}){
 return <div className="pointer-effect-setting">
  <label className="holo-setting-row"><span>鼠标动效</span><select aria-label="鼠标动效" value={mode} onChange={e=>onChange(e.target.value as PointerMode)}>
   <option value="dust">星尘扰动</option><option value="scan">全息扫描</option><option value="off">关闭</option>
  </select></label>
  {mode!=='off'&&<div className="pointer-preview-field"><span>在这里移动鼠标试试</span><PointerEffects mode={mode} preview/></div>}
 </div>;
}
