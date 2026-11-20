import {FileText,GitBranch,Globe2,MessageCircle,ScanLine} from 'lucide-react';
type View='chat'|'directions'|'research'|'plan';
type Props={view:View;hasAnalysis:boolean;hasResearch:boolean;hasPlan:boolean;busy:boolean;planProgress?:{done:number;total:number};onChat:()=>void;onDirections:()=>void;onResearch:()=>void;onPlan:()=>void;onFull?:()=>void};
export default function IdeaJourney({view,hasAnalysis,hasResearch,hasPlan,busy,planProgress,onChat,onDirections,onResearch,onPlan,onFull}:Props){
 const steps=[
  {id:'chat',name:'继续聊',hint:'把想法说清楚',Icon:MessageCircle,action:onChat,disabled:false},
  {id:'directions',name:'看方向',hint:'发现不同的可能',Icon:GitBranch,action:onDirections,disabled:!hasAnalysis},
  {id:'research',name:'联网研究',hint:hasResearch?'查看研究与出处':'查资料，学习做法',Icon:Globe2,action:onResearch,disabled:!hasAnalysis||(!hasResearch&&busy)},
  {id:'plan',name:'行动计划',hint:planProgress?`${planProgress.done}/${planProgress.total} 步已完成`:hasPlan?'查看步骤与进度':'把想法拆成步骤',Icon:ScanLine,action:onPlan,disabled:!hasAnalysis||(!hasPlan&&busy)},
 ];
 return <nav className="idea-journey" aria-label="想法下一步">{steps.map((s,i)=><button aria-label={s.name} aria-current={view===s.id?'step':undefined} className={view===s.id?'active':''} disabled={s.disabled} key={s.id} onClick={s.action}><span className="journey-index">{String(i+1).padStart(2,'0')}</span><s.Icon size={16}/><span><b>{s.name}</b><small>{s.hint}</small></span></button>)}{onFull&&<button className="journey-full" onClick={onFull}><FileText size={14}/>{view==='research'?'完整报告':'完整记录'}</button>}</nav>;
}
