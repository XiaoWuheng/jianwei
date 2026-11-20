import {randomUUID} from 'node:crypto';
import {matchesSchema} from './reports.mjs';
import {ideationSchema,blueprintSchema,memorySchema} from './brain-schema.mjs';
import {ideationPrompt,blueprintPrompt,memoryPrompt} from './brain-prompts.mjs';
import {engineHealth,runResearch} from './engine.mjs';
const now=()=>new Date().toISOString();
const clean=(v,max=20000)=>typeof v==='string'?v.trim().slice(0,max):'';
const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function validateIdeation(value,allowed=[]){
 if(!matchesSchema(value,ideationSchema)||!value.understanding.trim()||!value.reply.trim()||!value.directions.length)throw new Error('这次推演未形成完整结果，可以重试，原话已经保存。');
 const used=new Set();value.directions=value.directions.filter(d=>validId(d.id)&&d.title.trim()&&!used.has(d.id)&&(used.add(d.id),true)).slice(0,8);
 if(!value.directions.length)throw new Error('这次推演的分支无法读取，请重试。');
 value.questions=value.questions.slice(0,3);value.clarity=value.clarity.slice(0,8);
 value.connections=value.connections.filter(c=>allowed.some(x=>x.id===c.id&&x.kind===c.kind)).slice(0,6);
 return value;
}
export function validateBlueprint(value,project){
 if(!matchesSchema(value,blueprintSchema)||!value.title.trim()||!value.milestones.length||!value.deliverables.length)throw new Error('蓝图未形成完整结果，可以重新生成。');
 const ids=new Set();
 for(const m of value.milestones){if(!m.tasks.length)throw new Error('蓝图缺少可执行任务，请重新生成。');for(const task of m.tasks){if(!validId(task.id)||ids.has(task.id))throw new Error('蓝图任务标识重复，请重新生成。');ids.add(task.id);}}
 const completed=new Set();
 // Dependencies must point to an earlier task. This guarantees an executable, acyclic sequence.
 for(const m of value.milestones)for(const task of m.tasks){task.dependsOn=task.dependsOn.filter(id=>completed.has(id));completed.add(task.id);}
 const sourceIds=new Set(project?.report?.sources.map(s=>s.id)||[]);
 for(const e of value.evidence){e.sourceIds=e.sourceIds.filter(id=>sourceIds.has(id));if(e.kind==='fact'&&!e.sourceIds.length)e.kind='hypothesis';}
 return value;
}
export function validateMemory(value,ids){
 if(!matchesSchema(value,memorySchema)||!value.summary.trim())throw new Error('记忆摘要不完整，请重试。');
 for(const key of ['themes','decisions','unresolved','connections'])value[key]=value[key].map(x=>({...x,sourceIds:[...new Set(x.sourceIds.filter(id=>ids.has(id)))]})).filter(x=>x.sourceIds.length).slice(0,8);
 return value;
}
function tokens(text){return new Set((text.toLowerCase().match(/[a-z0-9]{3,}|[\u4e00-\u9fff]{2,}/g)||[]).flatMap(x=>/[\u4e00-\u9fff]/.test(x)?Array.from({length:x.length-1},(_,i)=>x.slice(i,i+2)):[x]));}
export function relatedContext(t,thoughts,projects,latest,corrections=''){
 const terms=tokens(t.rawIdea+' '+(t.analysis?.understanding||'')+' '+(t.messages.at(-1)?.content||''));
 const candidates=[...thoughts.filter(x=>x.id!==t.id&&x.analysis&&!x.archived&&(!x.isExample||t.isExample)).map(x=>({id:x.id,kind:'thought',title:x.title,summary:x.analysis.understanding,brief:x.analysis.workingBrief,updatedAt:x.updatedAt})),...projects.filter(x=>x.report&&!x.archived&&(!x.isExample||t.isExample)).map(x=>({id:x.id,kind:'project',title:x.title,summary:x.report.summary,updatedAt:x.updatedAt}))];
 const rank=candidates.map(x=>({...x,score:[...tokens(x.title+' '+x.summary)].filter(w=>terms.has(w)).length+(t.seedIds?.includes(x.id)?100:0)})).sort((a,b)=>b.score-a.score||b.updatedAt.localeCompare(a.updatedAt)).slice(0,8);
 return {corrections,summary:latest?{title:latest.title,summary:latest.summary,themes:latest.themes,decisions:latest.decisions,unresolved:latest.unresolved,connections:latest.connections}:null,entries:rank.map(({score,...x})=>x)};
}
export function thoughtMarkdown(t,project){
 const a=t.analysis,b=t.blueprint;
 return `# ${t.title}\n\n## 最初的原话\n\n${t.rawIdea}\n\n对标/参照：${t.reference||'未指定'}\n\n限制：${t.constraints||'未指定'}\n\n${a?`## 当前理解\n\n${a.understanding}\n\n${a.reply}\n\n## 思维分支\n\n${a.directions.map(d=>`### ${d.title}${t.focusId===d.id?' · 当前聚焦':''}\n\n${d.description}\n\n潜在价值：${d.value}\n\n第一步实验：${d.firstExperiment}\n\n待验证：${d.assumptions.join('；')}`).join('\n\n')}\n\n## 书面定义\n\n目的：${a.workingBrief.purpose}\n\n对象：${a.workingBrief.audience}\n\n预期成果：${a.workingBrief.outcome}\n\n范围：${a.workingBrief.scope.join('；')}\n\n暂不包含：${a.workingBrief.notDoing.join('；')}\n\n通过标准：${a.workingBrief.successCriteria.join('；')}\n\n关键假设：${a.workingBrief.assumptions.join('；')}\n\n## 需要查证\n\n${a.researchQuestions.map(q=>'- '+q).join('\n')}`:'尚未完成推演。'}\n\n${b?`## 执行蓝图 · ${t.blueprintEvidence==='researched'?'参考过联网研究，仍需验证':'待验证'}\n\n${b.vision}\n\n成果形式：${b.form}\n\n目标对象：${b.audience}\n\n问题：${b.problem}\n\n价值：${b.value}\n\n### 执行/使用过程\n\n${b.journey.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n### 范围与边界\n\n包含：${b.scope.join('；')}\n\n不包含：${b.excluded.join('；')}\n\n### 交付物\n\n${b.deliverables.map(d=>`- **${d.title}**（${d.format}）：${d.description}\n  - 验收：${d.acceptance}`).join('\n')}\n\n${b.milestones.map(m=>`### ${m.title} · ${m.duration}\n\n${m.goal}\n\n${m.tasks.map(k=>`- [${t.tasks[k.id]?'x':' '}] **${k.title}**\n  - 怎么做：${k.instruction}\n  - 产出：${k.output}\n  - 验收：${k.acceptance}\n  - 依赖：${k.dependsOn.join('、')||'无'}`).join('\n')}`).join('\n\n')}\n\n### 资源估计（以实际条件为准）\n\n${b.resources.map(r=>`- ${r.name}：${r.purpose}；${r.estimate}`).join('\n')}\n\n### 风险验证\n\n${b.risks.map(r=>`- ${r.risk}\n  - 验证：${r.validation}\n  - 通过标准：${r.passCriteria}`).join('\n')}\n\n### 尚待确定\n\n${b.openQuestions.map(q=>'- '+q).join('\n')}\n\n### 依据\n\n${b.evidence.map(e=>`- ${e.kind}：${e.claim} ${e.sourceIds.map(id=>{const s=project?.report?.sources.find(s=>s.id===id);return s?`[${id}](${s.url})`:'';}).join(' ')}`).join('\n')}\n\n### 边界\n\n${b.limitations.map(s=>'- '+s).join('\n')}\n\n下一步：${b.nextAction}`:''}\n\n## 完整对话\n\n${t.messages.map(m=>`### ${m.role==='user'?'我':'见微'} · ${m.at}\n\n${m.content}`).join('\n\n')}\n\n## 我的笔记\n\n${t.notes||'暂无'}\n\n---\n推演与蓝图是思考建议；外部事实请结合研究原文验证。原始记录未因摘要被删除。`;
}
export function handoffMarkdown(t,project){
 const b=t.blueprint;if(!b)return `# ${t.title}\n\n请先生成执行蓝图。`;
 const tasks=b.milestones.flatMap(m=>m.tasks);
 const sourceIds=new Set(b.evidence.flatMap(e=>e.sourceIds));
 return `# 制作任务书 · ${b.title}\n\n请根据下面的目标和边界完成对应成果。先确认阻碍执行的未知项，再分阶段制作与验证；不要将未查证的假设写成事实。\n\n## 用户最初的想法\n\n${t.rawIdea}\n\n用户明确补充的限制：${t.constraints||'未指定，不能擅自假定预算、团队或截止日期。'}\n\n## 目标与成果\n\n成果形式：${b.form}\n\n愿景：${b.vision}\n\n目标对象：${b.audience}\n\n要解决的问题：${b.problem}\n\n核心价值：${b.value}\n\n## 范围\n\n本次包含：\n${b.scope.map(x=>'- '+x).join('\n')}\n\n暂不包含：\n${b.excluded.map(x=>'- '+x).join('\n')}\n\n## 实际使用或执行过程\n\n${b.journey.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\n## 交付物与验收\n\n${b.deliverables.map(d=>`### ${d.title}\n\n形式：${d.format||'见交付说明，仍可明确'}\n\n${d.description}\n\n验收：${d.acceptance}`).join('\n\n')}\n\n## 阶段任务\n\n${b.milestones.map(m=>`### ${m.title}\n\n目标：${m.goal}\n\n时间为规划估计：${m.duration}\n\n${m.tasks.map(k=>`- [${t.tasks[k.id]?'x':' '}] ${k.title}\n  - 怎样做：${k.instruction}\n  - 产出：${k.output}\n  - 验收：${k.acceptance}\n  - 依赖：${k.dependsOn.map(id=>tasks.find(t=>t.id===id)?.title||id).join('；')||'无'}`).join('\n')}`).join('\n\n')}\n\n## 优先验证的风险\n\n${b.risks.map(r=>`- ${r.risk}\n  - 验证：${r.validation}\n  - 通过标准：${r.passCriteria}`).join('\n')}\n\n## 资源估计\n\n${b.resources.map(r=>`- ${r.name}：${r.purpose}；${r.estimate}`).join('\n')}\n\n## 待确定\n\n${b.openQuestions.map(q=>'- '+q).join('\n')}\n\n## 依据与边界\n\n研究状态：${t.blueprintEvidence==='researched'?'参考过联网研究，仍需根据原文和实际执行验证。':'尚未经外部研究验证。'}\n\n${b.evidence.map(e=>`- ${{fact:'来源支持',inference:'推断',hypothesis:'待验证'}[e.kind]}：${e.claim} ${e.sourceIds.map(id=>{const s=project?.report?.sources.find(s=>s.id===id);return s?`[${id}](${s.url})`:'';}).join(' ')}`).join('\n')}\n\n${(project?.report?.sources||[]).filter(s=>sourceIds.has(s.id)).map(s=>`- [${s.id} ${s.title}](${s.url})`).join('\n')}\n\n${b.limitations.map(x=>'- '+x).join('\n')}\n\n## 从这里开始\n\n${b.nextAction}\n\n请汇报实际完成的交付物、验证结果和剩余问题。不要用计划或模拟结果声称真实工作已经完成。`;
}
export function createBrain({store,directory,jobs,broadcast,json,body,beginResearch,run=runResearch,health=engineHealth}){
 const emit=t=>{store.putThought(t);broadcast({type:'thought',thought:t});};
 let memoryState={pending:false,error:'',lastAttempt:''};
 for(const t of store.thoughts())if(t.pending){t.pending=false;t.error='上次推演因应用关闭而中断。原话与上一版结果已保留，可以重试。';emit(t);}
 const state=()=>({...memoryState,corrections:store.preferences().memoryCorrections||'',latest:store.memories()[0]||null,count:store.memories().length,preferences:{memoryAuto:store.preferences().memoryAuto,memoryDays:store.preferences().memoryDays}});
 const queue=new Set();let checkingQueue=false;
 async function available(){if(jobs.size)fail('中枢正在处理另一项思考或研究，完成或停止后即可继续。',409);const h=await health();if(!h.available)fail(h.detail,503);if(jobs.size)fail('中枢正在处理另一项思考或研究，请稍后再试。',409);}
 async function think(t,kind='ideation'){
  const c=new AbortController();jobs.set(t.id,c);t.pending=true;t.jobKind=kind;t.error='';t.events=[];t.updatedAt=now();emit(t);
  const context=relatedContext(t,store.thoughts(),store.list(),store.memories()[0],store.preferences().memoryCorrections||'');
  const project=t.projectId?store.get(t.projectId):null;
  try{
   const {result}=await run({directory,kind,signal:c.signal,prompt:kind==='blueprint'?blueprintPrompt(t,project):ideationPrompt(t,context,project),onEvent(event){if(c.signal.aborted)return;const current=store.thought(t.id);if(!current)return;current.events.push({...event,at:now()});current.events=current.events.slice(-12);emit(current);}});
   if(c.signal.aborted)return;const current=store.thought(t.id);if(!current)return;
   if(kind==='ideation'){
    const a=validateIdeation(result,context.entries);if(current.analysis)current.versions=[...(current.versions||[]),{at:current.contentAt||current.updatedAt,analysis:current.analysis}].slice(-12);
    current.analysis=a;current.title=a.title;current.messages.push({id:randomUUID(),role:'assistant',content:a.reply,at:now()});
    if(!a.directions.some(d=>d.id===current.focusId))current.focusId='';
   }else{
    const blueprint=validateBlueprint(result,project);
    if(current.blueprint)current.blueprintVersions=[...(current.blueprintVersions||[]),{at:current.blueprintAt,blueprint:current.blueprint,tasks:current.tasks,evidence:current.blueprintEvidence}].slice(-6);
    current.blueprint=blueprint;current.blueprintAt=now();current.blueprintEvidence=project?.report?'researched':'unverified';
    const oldTasks=new Map((t.blueprint?.milestones||[]).flatMap(m=>m.tasks.map(k=>[k.id,k])));
    current.tasks=Object.fromEntries(blueprint.milestones.flatMap(m=>m.tasks.filter(k=>{const old=oldTasks.get(k.id);return old&&old.title.trim()===k.title.trim()&&old.output.trim()===k.output.trim()&&typeof current.tasks[k.id]==='boolean';}).map(k=>[k.id,current.tasks[k.id]])));
   }
   current.pending=false;current.jobKind=null;current.updatedAt=now();current.contentAt=current.updatedAt;emit(current);
  }catch(e){const current=store.thought(t.id);if(current&&!c.signal.aborted){current.pending=false;current.jobKind=null;current.error=e.message;emit(current);}}
  finally{if(jobs.get(t.id)===c)jobs.delete(t.id);}
 }
 function newThought(input,seedIds=[]){
  const stamp=now();return {id:randomUUID(),title:clean(input.idea,24),rawIdea:clean(input.idea),reference:clean(input.reference,5000),constraints:clean(input.constraints,5000),createdAt:stamp,updatedAt:stamp,contentAt:stamp,messages:[{id:randomUUID(),role:'user',content:clean(input.idea),at:stamp}],analysis:null,blueprint:null,blueprintAt:null,blueprintEvidence:'unverified',pending:false,jobKind:null,error:'',events:[],focusId:'',projectId:null,tasks:{},notes:'',archived:false,seedIds,versions:[],blueprintVersions:[]};
 }
 async function drain(){
  if(jobs.size||checkingQueue||!queue.size)return;checkingQueue=true;
  try{const h=await health();if(jobs.size)return;const id=queue.values().next().value;queue.delete(id);const t=store.thought(id);if(!t?.pending||t.jobKind!=='queued')return;
   if(!h.available){t.pending=false;t.jobKind=null;t.error=h.detail;emit(t);return;}void think(t);
  }catch{const id=queue.values().next().value;queue.delete(id);const t=store.thought(id);if(t){t.pending=false;t.jobKind=null;t.error='暂时无法连接思维引擎，原话已保存，可以稍后重试。';emit(t);}}
  finally{checkingQueue=false;}
 }
 function compactCandidates(manual){
  const prev=store.memories()[0],revisions=prev?.sourceRevisions||{},days=store.preferences().memoryDays;
  const cutoff=Date.now()-days*86400000;
  return store.thoughts().filter(t=>t.analysis&&!t.isExample&&!t.pending&&revisions[t.id]!==t.contentAt&&(manual||new Date(t.contentAt).getTime()<cutoff)).sort((a,b)=>a.contentAt.localeCompare(b.contentAt)).slice(0,30);
 }
 async function compact(candidates){
  const c=new AbortController();jobs.set('memory',c);memoryState={pending:true,error:'',lastAttempt:now()};broadcast({type:'memory',memory:state()});
  const previous=store.memories()[0];
  try{
   const payload=[],included=[];let size=2;
   for(const t of candidates){const brief=Object.fromEntries(Object.entries(t.analysis.workingBrief).map(([k,v])=>[k,Array.isArray(v)?v.slice(0,8).map(s=>s.slice(0,600)):v.slice(0,1600)]));const item={id:t.id,title:t.title,rawIdea:t.rawIdea.slice(0,2000),understanding:t.analysis.understanding.slice(0,1800),brief,focus:t.analysis.directions.find(d=>d.id===t.focusId)?.title||'',userStatements:t.messages.filter(m=>m.role==='user').slice(-8).map(m=>m.content.slice(0,900)),notes:t.notes.slice(0,1500)};const itemSize=JSON.stringify(item).length+1;if(size+itemSize>60000)break;payload.push(item);included.push(t);size+=itemSize;}
   if(!included.length)throw new Error('这批记忆内容过大，请先缩小笔记后再整理。原始记录完整保留。');
   const {result}=await run({directory,kind:'memory',signal:c.signal,prompt:memoryPrompt(payload,previous,store.preferences().memoryCorrections||'')});
   if(c.signal.aborted)return;
   const allIds=new Set(store.thoughts().map(t=>t.id)),allowedIds=new Set([...included.map(t=>t.id),...(previous?.sourceIds||[])]);const value=validateMemory(result,allowedIds);
   const sourceRevisions=Object.fromEntries(Object.entries({...previous?.sourceRevisions,...Object.fromEntries(included.map(t=>[t.id,t.contentAt]))}).filter(([id])=>allIds.has(id)));
   store.putMemory({id:randomUUID(),createdAt:now(),...value,sourceRevisions,sourceIds:Object.keys(sourceRevisions),batchIds:included.map(t=>t.id),automatic:!manualCompaction});
   memoryState={...memoryState,pending:false,error:''};broadcast({type:'memory',memory:state()});
  }catch(e){memoryState={...memoryState,pending:false,error:e.message};broadcast({type:'memory',memory:state()});}
  finally{if(jobs.get('memory')===c)jobs.delete('memory');manualCompaction=false;}
 }
 let manualCompaction=false;
 async function autoCompact(){
  if(!store.preferences().memoryAuto||jobs.size||queue.size||checkingQueue)return;
  if(memoryState.lastAttempt&&Date.now()-new Date(memoryState.lastAttempt).getTime()<86400000)return;
  const last=store.memories()[0];if(last&&Date.now()-new Date(last.createdAt).getTime()<store.preferences().memoryDays*86400000)return;
  const candidates=compactCandidates(false);if(candidates.length<3&&!candidates.some(t=>t.messages.filter(m=>m.role==='user').length>=12))return;
  const h=await health();if(!h.available||jobs.size||queue.size)return;void compact(candidates);
 }
 const timer=setInterval(()=>void autoCompact(),30*60*1000);timer.unref();
 const queueTimer=setInterval(()=>void drain(),1200);queueTimer.unref();
 const initial=setTimeout(()=>void autoCompact(),60_000);initial.unref();
 async function handle(req,res,path){
  if(path==='/api/memory'&&req.method==='GET'){json(res,state());return true;}
  if(path==='/api/memory/history'&&req.method==='GET'){json(res,store.memories());return true;}
  if(path==='/api/memory/corrections'&&req.method==='PUT'){const b=await body(req);if(typeof b.text!=='string')fail('请填写想纠正的记忆。');store.savePreferences({...store.preferences(),memoryCorrections:clean(b.text,10000)});broadcast({type:'memory',memory:state()});json(res,state());return true;}
  if(path==='/api/memory/compact'&&req.method==='POST'){
   const candidates=compactCandidates(true);if(!candidates.length)fail('没有需要整理的新记忆。完成新的推演后再来看看。');await available();manualCompaction=true;void compact(candidates);json(res,state(),202);return true;
  }
  if(path==='/api/thoughts'){
   if(req.method==='GET'){json(res,store.thoughts());return true;}
   if(req.method==='POST'){
    const b=await body(req);if(clean(b.idea).length<3)fail('先说一点你的想法，至少 3 个字就可以。');if(queue.size>=30)fail('已经留下了 30 个待推演想法，先处理一些，再继续捕捉。',409);
    const seedIds=Array.isArray(b.seedIds)?b.seedIds.filter(id=>store.thought(id)?.analysis).slice(0,6):[];
    const t=newThought(b,seedIds);t.pending=true;t.jobKind='queued';t.events=[{message:'原话已保存，等待思维引擎空闲后自动推演。',at:now()}];emit(t);queue.add(t.id);void drain();json(res,t,201);return true;
   }
  }
  const match=path.match(/^\/api\/thoughts\/([a-zA-Z0-9_-]+)(?:\/(message|retry|cancel|research|blueprint|export|handoff))?$/);if(!match)return false;
  let t=store.thought(match[1]);if(!t)fail('这个想法不存在。',404);const action=match[2];
  if(!action&&req.method==='GET'){json(res,t);return true;}
  if(action==='export'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(t.title+'.md')}`});res.end(thoughtMarkdown(t,store.get(t.projectId||'')));return true;}
  if(action==='handoff'&&req.method==='GET'){json(res,{text:handoffMarkdown(t,store.get(t.projectId||''))});return true;}
  if(!action&&req.method==='PATCH'){
   const b=await body(req);t=store.thought(t.id);
   if(typeof b.title==='string'&&b.title.trim())t.title=clean(b.title,120);
   if(typeof b.notes==='string'){t.notes=clean(b.notes,100000);t.contentAt=now();}
   if(typeof b.archived==='boolean')t.archived=b.archived;
   if(typeof b.isExample==='boolean')t.isExample=b.isExample;
   if(typeof b.focusId==='string'&&(b.focusId===''||t.analysis?.directions.some(d=>d.id===b.focusId)))t.focusId=b.focusId;
   if(b.taskUpdate&&typeof b.taskUpdate.done==='boolean'&&t.blueprint?.milestones.some(m=>m.tasks.some(k=>k.id===b.taskUpdate.id)))t.tasks={...t.tasks,[b.taskUpdate.id]:b.taskUpdate.done};
   t.updatedAt=now();emit(t);json(res,t);return true;
  }
  if(action==='cancel'&&req.method==='POST'){
   const c=jobs.get(t.id);if(c)c.abort();if(c||queue.has(t.id)){jobs.delete(t.id);queue.delete(t.id);t.pending=false;t.jobKind=null;t.error='已停止本次推演，原话与上一版结果已保留。';emit(t);}json(res,t);return true;
  }
  if(action==='retry'&&req.method==='POST'){if(t.pending)fail('这个念头已在等待或推演中，可以先停止再重试。',409);await available();void think(t);json(res,store.thought(t.id));return true;}
  if(action==='message'&&req.method==='POST'){
   const b=await body(req);if(!clean(b.message,12000))fail('说说你想继续探索什么。');if(t.pending)fail('正在处理这个念头，请等完成或停止后再继续。',409);await available();
   t.messages.push({id:randomUUID(),role:'user',content:clean(b.message,12000),at:now()});t.contentAt=now();void think(t);json(res,store.thought(t.id));return true;
  }
  if(action==='blueprint'&&req.method==='POST'){
   if(!t.analysis)fail('先完成一次推演，再整理成蓝图。');if(t.pending)fail('这个念头正在处理中，请稍后再生成蓝图。',409);await available();void think(t,'blueprint');json(res,store.thought(t.id));return true;
  }
  if(action==='research'&&req.method==='POST'){
   if(!t.analysis)fail('先完成一次推演，再展开联网研究。');const b=await body(req);await available();
   const stamp=now(),a=t.analysis,focus=a.directions.find(d=>d.id===t.focusId);
   const p={id:randomUUID(),title:t.title,thoughtId:t.id,idea:`用户原话：${t.rawIdea}\n当前理解：${a.understanding}\n当前方向：${focus?JSON.stringify(focus):'比较各方向并提出最合适的起点'}\n书面定义：${JSON.stringify(a.workingBrief)}\n待查问题：${a.researchQuestions.join('；')}\n注意：AI推演中的假设尚未验证，不把它们当作用户已确认的需求或事实。`,reference:t.reference,constraints:t.constraints,mode:'full',depth:b.depth==='deep'?'deep':'standard',region:store.preferences().region,createdAt:stamp,updatedAt:stamp,status:'researching',report:null,events:[],messages:[],notes:'',tasks:{},savedSourceIds:[],archived:false,searchCount:0,error:''};
   store.put(p);t.projectId=p.id;t.updatedAt=stamp;emit(t);void beginResearch(p);json(res,{thought:store.thought(t.id),project:store.get(p.id)},201);return true;
  }
  fail('此操作不受支持。',405);
 }
 return {handle,stop(){clearInterval(timer);clearInterval(queueTimer);clearTimeout(initial);},state,autoCompact};
}
export function importThought(raw,thoughts=[],projects=[]){
 if(!raw||!validId(raw.id)||typeof raw.rawIdea!=='string')return null;
 const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?now():d.toISOString();};
 const t={id:raw.id,title:clean(raw.title,120)||clean(raw.rawIdea,24),rawIdea:clean(raw.rawIdea),reference:clean(raw.reference,5000),constraints:clean(raw.constraints,5000),createdAt:date(raw.createdAt),updatedAt:date(raw.updatedAt),contentAt:date(raw.contentAt||raw.updatedAt),analysis:null,blueprint:null,blueprintAt:raw.blueprintAt?date(raw.blueprintAt):null,blueprintEvidence:raw.blueprintEvidence==='researched'?'researched':'unverified',pending:false,jobKind:null,error:'',events:[],messages:[],focusId:clean(raw.focusId,100),projectId:validId(raw.projectId)?raw.projectId:null,tasks:{},notes:clean(raw.notes,100000),archived:!!raw.archived,isExample:!!raw.isExample,seedIds:Array.isArray(raw.seedIds)?raw.seedIds.filter(validId).slice(0,6):[],versions:[],blueprintVersions:[]};
 const allowed=[...thoughts.filter(x=>x&&validId(x.id)).map(x=>({id:x.id,kind:'thought'})),...projects.map(x=>({id:x.id,kind:'project'}))];
 try{t.analysis=validateIdeation(raw.analysis,allowed);}catch{}
 const project=projects.find(p=>p.id===t.projectId);
 try{t.blueprint=validateBlueprint(raw.blueprint,project);}catch{}
 if(!project?.report)t.blueprintEvidence='unverified';
 for(const v of (Array.isArray(raw.versions)?raw.versions:[]).slice(-12)){try{t.versions.push({at:date(v.at),analysis:validateIdeation(v.analysis,allowed)});}catch{}}
 for(const v of (Array.isArray(raw.blueprintVersions)?raw.blueprintVersions:[]).slice(-6)){try{t.blueprintVersions.push({at:date(v.at),blueprint:validateBlueprint(v.blueprint,project),tasks:v.tasks&&typeof v.tasks==='object'?Object.fromEntries(Object.entries(v.tasks).filter(([id,val])=>validId(id)&&typeof val==='boolean')):{},evidence:project?.report&&v.evidence==='researched'?'researched':'unverified'});}catch{}}
 if(raw.tasks&&typeof raw.tasks==='object'&&!Array.isArray(raw.tasks))t.tasks=Object.fromEntries(Object.entries(raw.tasks).filter(([id,v])=>validId(id)&&typeof v==='boolean'));
 if(Array.isArray(raw.messages))t.messages=raw.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({id:randomUUID(),role:m.role,content:clean(m.content,100000),at:date(m.at)}));
 return t;
}
