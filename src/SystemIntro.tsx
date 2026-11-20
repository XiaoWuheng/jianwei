import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Maximize,Minimize} from 'lucide-react';

type Props={ready:boolean;onStart:()=>void;onClose:()=>void;onToggleFullscreen:()=>void;fullscreen:boolean;fullscreenLabel:string};

export default function SystemIntro({ready,onStart,onClose,onToggleFullscreen,fullscreen,fullscreenLabel}:Props){
 const [started,setStarted]=useState(false);
 const overlay=useRef<HTMLDivElement>(null);
 const skip=useRef<HTMLButtonElement>(null);
 const toggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement;
  skip.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){
    event.preventDefault();
    event.stopPropagation();
    onClose();
   }else if(event.key==='Tab'){
    event.preventDefault();
    if(document.activeElement===skip.current&&toggle.current?.getClientRects().length){
     toggle.current.focus();
    }else{
     skip.current?.focus();
    }
   }
  };
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>{if(reduced.matches)onClose();};
  motion();
  window.addEventListener('keydown',key,true);reduced.addEventListener('change',motion);
  return()=>{window.removeEventListener('keydown',key,true);reduced.removeEventListener('change',motion);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[onClose]);
 useEffect(()=>{
  if(!ready||started)return;
  let cancelled=false,timer=0;
  const start=()=>{
   if(cancelled)return;
   void document.fonts.ready.then(()=>{
    if(cancelled)return;
    setStarted(true);
    onStart();
   });
  };
  if(document.querySelector('.webgl-ready'))start();else {window.addEventListener('jianwei-scene-ready',start,{once:true});timer=window.setTimeout(start,1400);}
  return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('jianwei-scene-ready',start);};
 },[ready,started,onStart]);
 useLayoutEffect(()=>{
  if(!started||!overlay.current)return;
  const viewport=overlay.current;
  const stage=document.querySelector<HTMLElement>('.cinematic-home:not(.scene-only) .reactor-stage');
  if(!stage)return;
  const updateCamera=()=>{
   const frame=viewport.getBoundingClientRect();
   const scene=stage.getBoundingClientRect();
   // Subtract the moving camera to recover the scene's current responsive home position.
   const [travelX,travelY]=getComputedStyle(stage).translate.split(' ').map(parseFloat);
   const homeX=scene.left+scene.width/2-(travelX||0);
   const homeY=scene.top+scene.height/2-(travelY||0);
   stage.style.setProperty('--cinema-offset-x',`${frame.left+frame.width/2-homeX}px`);
   stage.style.setProperty('--cinema-offset-y',`${frame.top+frame.height*.48-homeY}px`);
  };
  const observer=new ResizeObserver(updateCamera);
  observer.observe(viewport);
  observer.observe(stage);
  if(stage.parentElement)observer.observe(stage.parentElement);
  window.addEventListener('resize',updateCamera);
  document.addEventListener('fullscreenchange',updateCamera);
  updateCamera();
  return()=>{
   observer.disconnect();
   window.removeEventListener('resize',updateCamera);
   document.removeEventListener('fullscreenchange',updateCamera);
   stage.style.removeProperty('--cinema-offset-x');
   stage.style.removeProperty('--cinema-offset-y');
  };
 },[started]);
 useEffect(()=>{if(!started)return;window.dispatchEvent(new Event('jianwei-cinema-start'));const timer=setTimeout(onClose,6400);return()=>{clearTimeout(timer);window.dispatchEvent(new Event('jianwei-cinema-stop'));};},[started,onClose]);
 return <div ref={overlay} className={'system-intro '+(started?'playing':'preparing')} role="dialog" aria-modal="true" aria-label="见微开场动画">
  <div className="intro-shutter left"/>
  <div className="intro-shutter right"/>
  <div className="intro-flare"/>
  <div className="intro-identity">
   <span className="intro-overline">A THOUGHT BECOMES A WORLD</span>
   <div className="intro-word" aria-label="见微">{'JIANWEI'.split('').map((letter,i)=><span key={i} style={{'--i':i} as CSSProperties}>{letter}</span>)}</div>
   <h1>见微</h1>
   <p>一个念头，长出更多可能。</p>
   <span className="intro-rule"/>
  </div>
  <div className="intro-coordinates" aria-hidden="true"><span>JIANWEI / PERSONAL INTELLIGENCE</span><span>THINK · CONNECT · CREATE</span></div>
  <div className="intro-controls">
   <button ref={toggle} className="intro-fullscreen" onClick={onToggleFullscreen} aria-label={fullscreenLabel} title={fullscreenLabel}>{fullscreen?<Minimize size={17}/>:<Maximize size={17}/>}</button>
   <button ref={skip} className="intro-skip" onClick={onClose}>跳过开场<kbd>Esc</kbd><ArrowRight size={15}/></button>
  </div>
 </div>;
}
