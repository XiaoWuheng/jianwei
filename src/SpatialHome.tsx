import {useState,type CSSProperties} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Check,Lightbulb,Search} from 'lucide-react';
import type {Health,MemoryState,Project,Thought} from './types';
import {api} from './api';
import ThoughtInput from './ThoughtInput';
import HoloReactor from './HoloReactor';

type Props={thoughts:Thought[];projects:Project[];health:Health|null;memory:MemoryState|null;navigate:(s:string)=>void;onThought:(t:Thought)=>void;notify:(s:string)=>void;sceneOnly?:boolean;context?:{title:string;subtitle:string}};
const starters=[
 {label:'有个模糊的念头',value:'我最近一直在想一件事，但还没想清楚：'},
 {label:'想参考一个作品',value:'我看到一个很喜欢的产品或作品，想学习它，也想做出自己的东西：'},
 {label:'把想法做出来',value:'我想把这个想法变成实际能做的事情，先从一个小尝试开始：'},
];

export default function SpatialHome({thoughts,projects,health,memory,navigate,onThought,notify,sceneOnly=false,context}:Props){
 const [suggestion,setSuggestion]=useState<{value:string;key:number}>();
 const active=thoughts.filter(t=>!t.archived),recent=active.filter(t=>!t.isExample).slice(0,3),example=active.find(t=>t.isExample&&t.analysis);
 const busy=thoughts.some(t=>t.pending)||projects.some(p=>p.status==='researching')||!!memory?.pending;
 const send=async(idea:string,reference:string,constraints:string)=>{const thought=await api<Thought>('/thoughts','POST',{idea,reference,constraints});onThought(thought);navigate('thought/'+thought.id);};
 return <div className={'spatial-home experience-home cinematic-home'+(sceneOnly?' scene-only':'')}>
  <div className="experience-grid" aria-hidden="true"><span/><span/><span/><span/></div>
  <div className={'reactor-stage '+(busy?'is-processing':'')}>
   <div className="reactor-aura" aria-hidden="true"/>
   <div className="reactor-volume"><HoloReactor busy={busy}/></div>
   <svg className="reactor-instruments" viewBox="0 0 700 700" fill="none" aria-hidden="true"><g className="reactor-instrument-spin"><circle cx="350" cy="350" r="300" stroke="#8fb7ba" strokeOpacity=".15" strokeDasharray="1 10"/><path d="M350 50A300 300 0 0 1 647 308M350 650A300 300 0 0 1 53 392" stroke="#c2f5f3" strokeOpacity=".6"/><circle cx="350" cy="50" r="3" fill="#f1e1bd"/></g><path d="M350 22v20m0 616v20M22 350h20m616 0h20" stroke="#b3d2d4" strokeOpacity=".45"/><path d="M133 145v-12h25m384 0h25v12M133 555v12h25m384 0h25v-12" stroke="#82a6aa" strokeOpacity=".4"/></svg>
   {sceneOnly?<div className="reactor-identity context-core" aria-hidden="true"><span className="reactor-name">JIANWEI</span><strong>{context?.title||'见微'}</strong><span className="reactor-status"><i/>{context?.subtitle||'你的思考助手'}</span></div>:<div className="reactor-identity home-core" aria-hidden="true"><span className="reactor-name">JIANWEI</span><strong>见微</strong><span className="reactor-status"><i/>{busy?'正在处理你的想法':'从一点，到更多可能'}</span></div>}
   <div className="reactor-ground" aria-hidden="true"><i/><i/><i/></div>
  </div>
  {!sceneOnly&&<>
   <div className="home-scene-name" aria-hidden="true">JIANWEI</div>
   <div className="home-scene-label" aria-hidden="true"><span>01 — INCEPTION</span><span>每个想法，都值得开始。</span></div>
   <div className="home-scene-caption" aria-hidden="true"><i/><span>PERSONAL INTELLIGENCE</span><small>THINK / CONNECT / CREATE</small></div>
   <aside className="home-spatial-records" aria-label="场景中的想法">{active.slice(0,3).map((t,i)=>{const report=projects.find(p=>p.id===t.projectId)?.report;return <button key={t.id} className="home-thought-node" style={{'--node-x':`${[81,70,91][i]}%`,'--node-y':`${[26,76,55][i]}%`} as CSSProperties} aria-label={`继续想法：${t.title}`} onClick={()=>navigate('thought/'+t.id)}><span className="thought-node-light"><i/></span><span><small>{t.isExample?'完整示例':'你的想法'}</small><b>{t.title}</b><em>{t.analysis?.directions.length||0} 个方向{report?` · ${report.sources.length} 份资料`:''}{t.blueprint?` · ${t.blueprint.milestones.flatMap(m=>m.tasks).length} 个步骤`:''}</em></span></button>;})}</aside>
   {recent.length>0&&<aside className="home-recent"><div><h2>继续上次的想法</h2><button onClick={()=>navigate('memory')}>全部<ArrowUpRight size={13}/></button></div>{recent.map(t=><button key={t.id} className="recent-signal" onClick={()=>navigate('thought/'+t.id)}><span>{t.pending?'正在整理':t.blueprint?'已有行动计划':'继续聊聊'}</span><b>{t.title}</b><ArrowUpRight size={14}/></button>)}</aside>}
   <section className="home-start" aria-labelledby="home-title">
    <div className="home-start-heading"><span className="home-kicker"><i/>你的创意与研究助手</span><h1 id="home-title">说说你的想法。</h1><p>不用想完整。我帮你找方向、查资料，再变成能做的事。</p></div>
    <ThoughtInput onSend={send} label="帮我想一想" draftKey="jianwei-thought-draft" suggestion={suggestion} notify={notify} placeholder="比如：我想让独居时的晚饭更有仪式感，也许能和朋友一起玩，但还不知道怎么做……"/>
    <div className="home-starters"><span>不知道怎么开头？</span>{starters.map((s,i)=><button key={s.label} onClick={()=>setSuggestion({value:s.value,key:Date.now()})}>{i===0?<Lightbulb size={13}/>:i===1?<Search size={13}/>:<Check size={13}/>}<span>{s.label}</span></button>)}</div>
    <div className="home-start-footer"><span><i/>{health?.available?'已就绪，想法会自动保存':'可以先保存想法，稍后连接 AI'}</span>{example&&<button className="example-launch" onClick={()=>navigate('thought/'+example.id)}><BookOpen size={15}/>先看一个完整示例<ArrowRight size={14}/></button>}</div>
   </section>
   <div className="home-journey" aria-label="使用流程"><div className="current"><span>01</span><b>说出想法</b><small>一句话也可以</small></div><i/><div><span>02</span><b>展开方向</b><small>找到更多可能</small></div><i/><div><span>03</span><b>查资料</b><small>学习真实做法</small></div><i/><div><span>04</span><b>做计划</b><small>从小步骤开始</small></div></div>
  </>}
 </div>;
}

export function CapturePanel({onThought,navigate,notify,thoughts}:{onThought:(t:Thought)=>void;navigate:(s:string)=>void;notify:(s:string)=>void;thoughts:Thought[]}){
 const [suggestion,setSuggestion]=useState<{value:string;key:number}>();
 const send=async(idea:string,reference:string,constraints:string)=>{const t=await api<Thought>('/thoughts','POST',{idea,reference,constraints});onThought(t);navigate('thought/'+t.id);};
 const example=thoughts.find(t=>t.isExample&&t.analysis);
 return <div className="capture-panel"><div className="capture-panel-heading"><span className="hud-label">A NEW IDEA</span><h1>说说你的想法。</h1><p>一句话、一个问题，或者你想参考的作品，都可以。</p></div><ThoughtInput onSend={send} label="帮我想一想" draftKey="jianwei-thought-draft" suggestion={suggestion} notify={notify}/><div className="capture-starters"><span>不知道怎么开头？</span>{starters.map(s=><button key={s.label} onClick={()=>setSuggestion({value:s.value,key:Date.now()})}>{s.label}<ArrowUpRight size={13}/></button>)}</div>{example&&<button className="capture-example" onClick={()=>navigate('thought/'+example.id)}><BookOpen size={15}/><span>先看一个完整示例</span><ArrowRight size={14}/></button>}</div>;
}
