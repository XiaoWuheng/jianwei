import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.mjs';
import {createBrain,validateIdeation,validateBlueprint,validateMemory,thoughtMarkdown,importThought,relatedContext} from '../server/brain.mjs';
import {ideationSchema,blueprintSchema,memorySchema} from '../server/brain-schema.mjs';
const stamp='2025-01-01T12:00:00.000Z';
function empty(schema){if(schema.type==='string')return schema.enum?.[0]||'待明确';if(schema.type==='array')return [];return Object.fromEntries(Object.entries(schema.properties).map(([k,v])=>[k,empty(v)]));}
function analysis(){const a=empty(ideationSchema);a.title='一顿饭的城市记忆';a.reply='先探索体验与内容，不急于做成软件。';a.understanding='用一道菜和声音连接城市记忆。';a.intentType='朋友交流体验';a.directions=[{id:'dinner',title:'隔空同桌',description:'朋友异步交换菜与声音。',value:'交换生活记忆',firstExperiment:'一个人先准备示例',assumptions:['朋友意愿待验证']},{id:'audio',title:'声音明信片',description:'先留给自己。',value:'记录',firstExperiment:'录一分钟',assumptions:[]}];a.workingBrief.purpose='先做一次单人示例';a.workingBrief.constraints='暂不做 App';return a;}
function blueprint(){const b=empty(blueprintSchema);b.title='城市晚饭准备包';b.form='交流体验';b.vision='先验证，再邀请。';b.deliverables=[{id:'invitation',title:'邀请草稿',format:'一页文字',description:'参与规则',acceptance:'读完知道怎么参与'}];b.milestones=[{id:'first',title:'验证',goal:'完成示例',duration:'估计一周末',tasks:[{id:'record',title:'录一段故事',instruction:'先写真实经历再录音',output:'一分钟声音',acceptance:'能说明菜和城市的关系',dependsOn:[]},{id:'invite',title:'写邀请草稿',instruction:'说明参与步骤',output:'邀请文案',acceptance:'能直接理解规则',dependsOn:['record']}]}];return b;}
function thought(id='memory-1'){return {id,title:'城市记忆',rawIdea:'我想让晚饭更有意思，但先不要 App。',reference:'',constraints:'一个人先试',createdAt:stamp,updatedAt:stamp,contentAt:stamp,messages:[{id:'u1',role:'user',content:'先不要 App。',at:stamp}],analysis:analysis(),blueprint:blueprint(),blueprintAt:stamp,blueprintEvidence:'unverified',pending:false,jobKind:null,error:'',events:[],focusId:'dinner',projectId:null,tasks:{record:true},notes:'我的原始笔记',archived:false,seedIds:[],versions:[],blueprintVersions:[]};}
function setup(run){const directory=mkdtempSync(join(tmpdir(),'jianwei-brain-'));const store=openStore(directory),jobs=new Map(),events=[];const brain=createBrain({store,directory,jobs,broadcast:e=>events.push(structuredClone(e)),json:(res,data,status=200)=>Object.assign(res,{data:structuredClone(data),status}),body:async req=>req.payload||{},beginResearch:async()=>{},health:async()=>({available:true}),run});return {directory,store,jobs,events,brain,async request(path,payload,method='POST'){const res={};await brain.handle({method,payload},res,path);return res;},close(){brain.stop();store.close();rmSync(directory,{recursive:true,force:true});}};}
async function until(predicate){for(let i=0;i<300;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw new Error('状态未在预期时间完成');}

test('a thought keeps its original words while unsupported memory links and fake evidence are rejected',()=>{
 const a=analysis();a.connections=[{id:'invented',kind:'thought',reason:'编造关联',possibility:'不应显示'},{id:'real',kind:'thought',reason:'真实记忆',possibility:'继续连接'}];assert.deepEqual(validateIdeation(a,[{id:'real',kind:'thought'}]).connections.map(x=>x.id),['real']);
 const b=blueprint();b.evidence=[{claim:'未查证事实',kind:'fact',sourceIds:['invented']}];b.milestones[0].tasks[0].dependsOn=['invite'];const validated=validateBlueprint(b,null);assert.equal(validated.evidence[0].kind,'hypothesis');assert.deepEqual(validated.milestones[0].tasks[0].dependsOn,[]);
 b.milestones[0].tasks[1].id='record';assert.throws(()=>validateBlueprint(b,null),/重复/);
 const m=empty(memorySchema);m.summary='摘要';m.decisions=[{decision:'测试',context:'测试',sourceIds:['missing']}];assert.equal(validateMemory(m,new Set(['real'])).decisions.length,0);
 const t=thought();const md=thoughtMarkdown(t);assert.match(md,/最初的原话/);assert.match(md,/先不要 App/);assert.match(md,/- \[x\] \*\*录一段故事/);assert.match(md,/验收：能说明菜和城市的关系/);
});

test('capturing another thought during inference saves it immediately; cancelling the queue never loses the first thought or concurrent notes',async()=>{
 let complete;const s=setup(()=>new Promise(resolve=>complete=resolve));
 try{
  const first=await s.request('/api/thoughts',{idea:'我想用一道菜记录城市'});await until(()=>s.jobs.size===1);const id=first.data.id;
  const second=await s.request('/api/thoughts',{idea:'还有一个完全不同的念头'});assert.equal(second.status,201);assert.equal(second.data.jobKind,'queued');assert.equal(s.store.thought(second.data.id).rawIdea,'还有一个完全不同的念头');
  await s.request('/api/thoughts/'+second.data.id+'/cancel',{});assert.equal(s.store.thought(second.data.id).pending,false);
  await s.request('/api/thoughts/'+id,{notes:'推演中写下的重要判断'},'PATCH');complete({result:analysis()});await until(()=>!s.store.thought(id).pending);
  const t=s.store.thought(id);assert.equal(t.rawIdea,'我想用一道菜记录城市');assert.equal(t.messages[0].content,t.rawIdea);assert.equal(t.notes,'推演中写下的重要判断');assert.equal(t.messages.at(-1).role,'assistant');assert.ok(t.analysis);assert.equal(s.jobs.size,0);
 }finally{s.close();}
});

test('continuing a thought versions the previous interpretation, and updating a blueprint preserves progress and prior artifacts',async()=>{
 const s=setup(async({kind})=>({result:kind==='blueprint'?blueprint():{...analysis(),understanding:'结合声音继续展开后的新理解'}}));
 try{const t=thought();s.store.putThought(t);
  await s.request('/api/thoughts/'+t.id+'/message',{message:'我想把声音和晚饭结合起来'});await until(()=>!s.store.thought(t.id).pending);
  let current=s.store.thought(t.id);assert.equal(current.versions.length,1);assert.equal(current.versions[0].analysis.understanding,t.analysis.understanding);assert.equal(current.messages.at(-2).content,'我想把声音和晚饭结合起来');assert.equal(current.rawIdea,t.rawIdea);
  await s.request('/api/thoughts/'+t.id+'/blueprint',{});await until(()=>!s.store.thought(t.id).pending);current=s.store.thought(t.id);assert.equal(current.tasks.record,true);assert.equal(current.blueprintVersions.length,1);assert.equal(current.blueprintVersions[0].tasks.record,true);
 }finally{s.close();}
});

test('periodic memory consolidation requires aged material, keeps original records, and never marks omitted records as summarized',async()=>{
 let inputIds=[];const s=setup(async({prompt})=>{inputIds=[...new Set([...prompt.matchAll(/"id":"(memory-\d+)"/g)].map(x=>x[1]))];const result=empty(memorySchema);result.title='长期记忆';result.summary='保留原始出处的个人思考摘要。';result.themes=[{title:'城市',insight:'仍在探索',sourceIds:inputIds.slice(0,2)}];return {result};});
 try{
  s.store.putThought({...thought('fresh'),contentAt:new Date().toISOString()});await s.brain.autoCompact();assert.equal(s.store.memories().length,0);
  for(let i=0;i<20;i++){const t=thought('memory-'+i);t.rawIdea='完整原话'.repeat(1000);t.notes='原始记录'.repeat(1000);t.messages=Array.from({length:8},(_,j)=>({id:'u'+j,role:'user',content:'不能被摘要覆盖的口语'.repeat(180),at:stamp}));s.store.putThought(t);}
  const before=structuredClone(s.store.thought('memory-0'));await s.brain.autoCompact();await until(()=>s.store.memories().length===1);
  const m=s.store.memories()[0];assert.ok(m.batchIds.length>0&&m.batchIds.length<20);assert.deepEqual(new Set(m.batchIds),new Set(inputIds));assert.deepEqual(s.store.thought('memory-0'),before);assert.equal(m.sourceIds.includes('fresh'),false);assert.equal(m.automatic,true);
  await s.brain.autoCompact();assert.equal(s.store.memories().length,1);
 }finally{s.close();}
});

test('examples do not become personal memories, and imported original conversations, versions and progress remain recoverable',()=>{
 const t=thought(),other={...thought('memory-2'),isExample:true};const c=relatedContext(t,[t,other],[],null);assert.equal(c.entries.length,0);
 t.versions=[{at:stamp,analysis:analysis()}];t.blueprintVersions=[{at:stamp,blueprint:blueprint(),tasks:{record:true},evidence:'unverified'}];t.messages.push({id:'a1',role:'assistant',content:'之前的推演',at:stamp});
 const imported=importThought(structuredClone({...t,pending:true}),[t],[]);assert.equal(imported.pending,false);assert.equal(imported.messages.length,2);assert.equal(imported.versions.length,1);assert.equal(imported.blueprintVersions.length,1);assert.equal(imported.tasks.record,true);assert.equal(imported.rawIdea,t.rawIdea);
});

test('an explicit memory correction is persisted and used in the next thought without rewriting history',async()=>{
 let prompt='';const s=setup(async args=>{prompt=args.prompt;return {result:analysis()};});
 try{const t=thought();s.store.putThought(t);await s.request('/api/memory/corrections',{text:'商业化只是备选，我现在只想保留为个人创作。'},'PUT');assert.match(s.brain.state().corrections,/个人创作/);await s.request('/api/thoughts/'+t.id+'/message',{message:'继续展开'});await until(()=>!s.store.thought(t.id).pending);assert.match(prompt,/商业化只是备选/);assert.equal(s.store.thought(t.id).rawIdea,t.rawIdea);assert.equal(s.store.preferences().memoryCorrections,s.brain.state().corrections);}finally{s.close();}
});

test('a reused task identifier cannot transfer completion to a different task',async()=>{
 const s=setup(async()=>{const b=blueprint();b.milestones[0].tasks[0].title='已经换成另一个任务';return {result:b};});
 try{const t=thought();s.store.putThought(t);await s.request('/api/thoughts/'+t.id+'/blueprint',{});await until(()=>!s.store.thought(t.id).pending);assert.equal(s.store.thought(t.id).tasks.record,undefined);assert.equal(s.store.thought(t.id).blueprintVersions[0].tasks.record,true);}finally{s.close();}
});

test('restoring a long conversation never silently discards old original messages',()=>{
 const t=thought();t.messages=Array.from({length:2505},(_,i)=>({id:'u'+i,role:i%2?'assistant':'user',content:'原始表达 '+i,at:stamp}));const restored=importThought(t);assert.equal(restored.messages.length,2505);assert.equal(restored.messages[0].content,'原始表达 0');assert.equal(restored.messages.at(-1).content,'原始表达 2504');
});
