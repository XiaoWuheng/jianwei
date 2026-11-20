import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openStore } from './store.mjs';
import { engineHealth,runResearch } from './engine.mjs';
import { researchPrompt,followupPrompt,channels } from './prompts.mjs';
import { validateReport, reportMarkdown } from './reports.mjs';
import { createBrain, importThought, validateMemory } from './brain.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const port=Number(process.env.JIANWEI_PORT||4317);
const directory=process.env.JIANWEI_DATA_DIR?resolve(process.env.JIANWEI_DATA_DIR):join(root,'data');
const store=openStore(directory),subscribers=new Set(),jobs=new Map();
mkdirSync(join(directory,'runs'),{recursive:true});
for(const p of store.list()) {
  if(p.status==='researching'){p.status='interrupted';p.error='上次研究因应用关闭而中断，可点击继续研究。';store.put(p);}
  if(p.chatPending){p.chatPending=false;p.chatError='上次追问被中断，可以重新发送。';store.put(p);}
}
function broadcast(data){for(const client of subscribers){try{client.write(`data: ${JSON.stringify(data)}\n\n`);}catch{subscribers.delete(client);}}}
function emit(p){store.put(p);broadcast({type:'project',project:p});}
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const text=(v,max=20000)=>typeof v==='string'?v.trim().slice(0,max):'';
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>(req.url?.startsWith('/api/import')?50_000_000:5_000_000))throw Object.assign(new Error('内容过大，请使用较小的文件。备份上限为 50 MB。'),{status:413});}try{return JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('请求内容无法读取。'),{status:400});}}
async function beginResearch(p){
  const controller=new AbortController();jobs.set(p.id,controller);
  p.status='researching';p.error='';p.searchCount=0;p.events=[];p.updatedAt=new Date().toISOString();
  p.events.push({id:randomUUID(),type:'start',message:'开始研究，准备从不同渠道寻找线索',at:new Date().toISOString()});emit(p);
  try{
    const {result,searchCount}=await runResearch({directory,prompt:researchPrompt(p),depth:p.depth,signal:controller.signal,onEvent(event){
      if(controller.signal.aborted)return;
      const current=store.get(p.id);if(!current)return;
      if(event.completed) current.searchCount=event.count;
      if(event.type==='search' && !event.completed)return;
      current.events.push({id:randomUUID(),...event,at:new Date().toISOString()});current.events=current.events.slice(-160);emit(current);
    }});
    if(controller.signal.aborted)return;
    const current=store.get(p.id);if(!current)return;
    const previousReport=current.report;const finishedTasks=new Set((previousReport?.roadmap||[]).flatMap((stage,si)=>stage.tasks.filter((task,ti)=>current.tasks[`${si}-${ti}`])));const savedUrls=new Set((previousReport?.sources||[]).filter(s=>current.savedSourceIds.includes(s.id)).map(s=>s.url));
    current.report=validateReport(result);current.tasks=Object.fromEntries(current.report.roadmap.flatMap((stage,si)=>stage.tasks.flatMap((task,ti)=>finishedTasks.has(task)?[[`${si}-${ti}`,true]]:[])));current.savedSourceIds=current.report.sources.filter(s=>savedUrls.has(s.url)).map(s=>s.id);current.title=result.title;current.status='complete';current.searchCount=searchCount;current.completedAt=new Date().toISOString();current.updatedAt=current.completedAt;
    current.events.push({id:randomUUID(),type:'complete',message:`研究完成，整理了 ${result.sources.length} 个资料来源`,at:current.completedAt});emit(current);
  }catch(e){const current=store.get(p.id);if(current && !controller.signal.aborted){current.status='failed';current.error=e.message;current.updatedAt=new Date().toISOString();emit(current);}}
  finally{jobs.delete(p.id);}
}
async function beginChat(p,message){
  const controller=new AbortController();jobs.set(p.id,controller);p.chatPending=true;p.chatError='';p.messages.push({id:randomUUID(),role:'user',content:message,at:new Date().toISOString()});emit(p);
  try{
    const {result}=await runResearch({directory,prompt:followupPrompt(p,message),kind:'chat',signal:controller.signal});
    if(controller.signal.aborted)return;
    const current=store.get(p.id);if(!current)return;
    current.messages.push({id:randomUUID(),role:'assistant',content:result.answer,sources:result.sources,at:new Date().toISOString()});current.chatPending=false;current.updatedAt=new Date().toISOString();emit(current);
  }catch(e){const current=store.get(p.id);if(current && !controller.signal.aborted){current.chatPending=false;current.chatError=e.message;emit(current);}}
  finally{jobs.delete(p.id);}
}
const brain=createBrain({store,directory,jobs,broadcast,json,body,beginResearch});
let vite;
if(process.argv.includes('--dev')){const {createServer}=await import('vite');vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});}
const server=http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host||'';
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(res,{error:'此入口仅限本机访问。'},403);
    const url=new URL(req.url,`http://${host}`),path=decodeURIComponent(url.pathname);
    if(req.method!=='GET' && req.method!=='HEAD'){
      if(req.headers.origin && ![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin))return json(res,{error:'请求来源不受支持。'},403);
      if(!req.headers['content-type']?.startsWith('application/json'))return json(res,{error:'请使用应用内操作。'},415);
    }
    if(path==='/api/health')return json(res,{app:'jianwei',version:'3.0.0',running:jobs.size});
    if(path==='/api/engine')return json(res,await engineHealth());
    if(path==='/api/channels')return json(res,channels);
    if(path==='/api/preferences'){
      if(req.method==='GET')return json(res,store.preferences());
      if(req.method==='PUT'){const b=await body(req);return json(res,store.savePreferences({...store.preferences(),name:text(b.name,40)||'探索者',depth:b.depth==='deep'?'deep':'standard',region:text(b.region,100)||'中国与全球',memoryAuto:typeof b.memoryAuto==='boolean'?b.memoryAuto:store.preferences().memoryAuto,memoryDays:[1,7,30].includes(b.memoryDays)?b.memoryDays:store.preferences().memoryDays}));}
    }
    if(path==='/api/events' && req.method==='GET'){
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');subscribers.add(res);
      const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),20000);req.on('close',()=>{clearInterval(heartbeat);subscribers.delete(res);});return;
    }
    if(path==='/api/backup' && req.method==='GET')return json(res,{app:'jianwei',version:2,exportedAt:new Date().toISOString(),preferences:store.preferences(),projects:store.list(),thoughts:store.thoughts(),memories:store.memories()});
    if(path==='/api/import' && req.method==='POST'){
      const b=await body(req);if(b.app!=='jianwei'||![1,2].includes(b.version)||!Array.isArray(b.projects)||b.projects.length>500||(b.thoughts&&(!Array.isArray(b.thoughts)||b.thoughts.length>2000))||(b.memories&&(!Array.isArray(b.memories)||b.memories.length>2000))) return json(res,{error:'这不是支持的见微备份文件。'},400);
      let count=0;for(const p of b.projects){if(!p || !/^[a-zA-Z0-9-]{1,80}$/.test(p.id)||typeof p.idea!=='string'||typeof p.title!=='string')continue;if(store.get(p.id))continue;
        const imported={id:p.id,thoughtId:typeof p.thoughtId==='string'?text(p.thoughtId,100):null,title:text(p.title,120),idea:text(p.idea),reference:text(p.reference),constraints:text(p.constraints),mode:['full','competitor','market','build'].includes(p.mode)?p.mode:'full',depth:p.depth==='deep'?'deep':'standard',region:text(p.region,100),createdAt:validDate(p.createdAt),updatedAt:validDate(p.updatedAt),completedAt:validDate(p.completedAt),status:'interrupted',report:null,events:[],messages:[],notes:text(p.notes,100000),tasks:{},savedSourceIds:[],archived:!!p.archived,searchCount:0,error:'导入了研究输入，可重新开始研究。'};
        if(p.report){try{imported.report=validateReport(p.report);imported.status='complete';imported.error='';}catch{}}
        if(p.tasks && typeof p.tasks==='object' && !Array.isArray(p.tasks)) imported.tasks=Object.fromEntries(Object.entries(p.tasks).filter(([k,v])=>/^\d+-\d+$/.test(k)&&typeof v==='boolean'));
        if(Array.isArray(p.savedSourceIds))imported.savedSourceIds=p.savedSourceIds.filter(id=>typeof id==='string').slice(0,500);
        if(Array.isArray(p.messages))imported.messages=p.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({id:randomUUID(),role:m.role,content:text(m.content,100000),at:validDate(m.at)}));
        store.put(imported);count++;}
      let thoughtCount=0,memoryCount=0;
      for(const raw of b.thoughts||[]){if(!raw||store.thought(raw.id))continue;const t=importThought(raw,b.thoughts,store.list());if(t){store.putThought(t);thoughtCount++;}}
      const thoughtIds=new Set(store.thoughts().map(t=>t.id));
      for(const raw of b.memories||[]){if(!raw||typeof raw.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id)||store.memories().some(m=>m.id===raw.id))continue;try{const {title,summary,themes,decisions,unresolved,connections,limitations}=raw;const value=validateMemory({title,summary,themes,decisions,unresolved,connections,limitations},thoughtIds);store.putMemory({id:raw.id,createdAt:validDate(raw.createdAt),...value,sourceIds:(raw.sourceIds||[]).filter(id=>thoughtIds.has(id)),sourceRevisions:Object.fromEntries(Object.entries(raw.sourceRevisions||{}).filter(([id,v])=>thoughtIds.has(id)&&typeof v==='string')),batchIds:(raw.batchIds||[]).filter(id=>thoughtIds.has(id)),automatic:!!raw.automatic});memoryCount++;}catch{}}
      if(b.preferences && typeof b.preferences==='object')store.savePreferences({...store.preferences(),name:text(b.preferences.name,40)||'探索者',depth:b.preferences.depth==='deep'?'deep':'standard',region:text(b.preferences.region,100)||'中国与全球',memoryCorrections:typeof b.preferences.memoryCorrections==='string'?text(b.preferences.memoryCorrections,10000):store.preferences().memoryCorrections||'',memoryAuto:typeof b.preferences.memoryAuto==='boolean'?b.preferences.memoryAuto:store.preferences().memoryAuto,memoryDays:[1,7,30].includes(b.preferences.memoryDays)?b.preferences.memoryDays:store.preferences().memoryDays});
      broadcast({type:'reload'});return json(res,{count,thoughtCount,memoryCount});
    }
    if(await brain.handle(req,res,path))return;
    if(path==='/api/projects'){
      if(req.method==='GET')return json(res,store.list());
      if(req.method==='POST'){
        const b=await body(req);if(!text(b.idea)||text(b.idea).length<5)return json(res,{error:'多写一点你的想法吧，至少 5 个字。'},400);
        if(jobs.size)return json(res,{error:'已有研究正在进行，完成或停止后即可开始新的研究。'},409);
        const health=await engineHealth();if(!health.available)return json(res,{error:health.detail},503);
        const now=new Date().toISOString();const p={id:randomUUID(),title:text(b.idea,24),idea:text(b.idea),reference:text(b.reference,5000),constraints:text(b.constraints,5000),mode:['full','competitor','market','build'].includes(b.mode)?b.mode:'full',depth:b.depth==='deep'?'deep':'standard',region:text(b.region,100)||'中国与全球',createdAt:now,updatedAt:now,status:'researching',report:null,events:[],messages:[],notes:'',tasks:{},savedSourceIds:[],archived:false,searchCount:0,error:''};
        store.put(p);void beginResearch(p);return json(res,store.get(p.id),201);
      }
    }
    const match=path.match(/^\/api\/projects\/([a-zA-Z0-9-]+)(?:\/(retry|cancel|chat|export))?$/);
    if(match){
      let p=store.get(match[1]);if(!p)return json(res,{error:'这个研究项目不存在。'},404);const action=match[2];
      if(action==='export' && req.method==='GET'){res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(p.title+'.md')}`,'Cache-Control':'no-store'});return res.end(reportMarkdown(p));}
      if(action==='retry' && req.method==='POST'){if(jobs.size)return json(res,{error:'当前有研究或追问正在进行。'},409);void beginResearch(p);return json(res,store.get(p.id));}
      if(action==='cancel' && req.method==='POST'){const controller=jobs.get(p.id);if(controller){controller.abort();if(p.chatPending){p.chatPending=false;p.chatError='已停止本次追问。';}else{p.status='interrupted';p.error='研究已停止，可以随时重新研究。';}emit(p);}return json(res,p);}
      if(action==='chat' && req.method==='POST'){const b=await body(req);if(!p.report)return json(res,{error:'研究完成后即可继续追问。'},400);if(!text(b.message,5000))return json(res,{error:'请输入想继续研究的问题。'},400);if(jobs.size)return json(res,{error:'已有研究或追问正在进行，请稍后再试。'},409);void beginChat(p,text(b.message,5000));return json(res,store.get(p.id));}
      if(!action && req.method==='GET')return json(res,p);
      if(!action && req.method==='PATCH'){
        const b=await body(req);p=store.get(match[1]);if(!p)return json(res,{error:'这个研究项目不存在。'},404);
        if(typeof b.title==='string'&&b.title.trim())p.title=text(b.title,120);
        if(typeof b.notes==='string')p.notes=text(b.notes,100000);
        if(typeof b.archived==='boolean')p.archived=b.archived;
        if(b.tasks && typeof b.tasks==='object' && !Array.isArray(b.tasks)) p.tasks=Object.fromEntries(Object.entries(b.tasks).filter(([k,v])=>/^\d+-\d+$/.test(k)&&typeof v==='boolean'));
        if(b.taskUpdate && typeof b.taskUpdate.key==='string' && typeof b.taskUpdate.done==='boolean'){
          const [stage,task]=b.taskUpdate.key.split('-').map(Number);
          if(/^\d+-\d+$/.test(b.taskUpdate.key) && p.report?.roadmap?.[stage]?.tasks?.[task]!==undefined)p.tasks={...p.tasks,[b.taskUpdate.key]:b.taskUpdate.done};
        }
        if(Array.isArray(b.savedSourceIds))p.savedSourceIds=b.savedSourceIds.filter(id=>p.report?.sources?.some(s=>s.id===id)).slice(0,500);
        if(b.sourceUpdate && typeof b.sourceUpdate.id==='string' && typeof b.sourceUpdate.saved==='boolean' && p.report?.sources.some(s=>s.id===b.sourceUpdate.id))p.savedSourceIds=b.sourceUpdate.saved?[...new Set([...p.savedSourceIds,b.sourceUpdate.id])]:p.savedSourceIds.filter(id=>id!==b.sourceUpdate.id);
        p.updatedAt=new Date().toISOString();emit(p);return json(res,p);
      }
      if(!action && req.method==='DELETE'){if(jobs.has(p.id))return json(res,{error:'请先停止正在进行的研究。'},409);store.remove(p.id);for(const client of subscribers)client.write(`data: ${JSON.stringify({type:'deleted',id:p.id})}\n\n`);return json(res,{ok:true});}
    }
    if(path.startsWith('/api/'))return json(res,{error:'此操作不存在。'},404);
    if(vite)return vite.middlewares(req,res,()=>json(res,{error:'页面不存在。'},404));
    if(!['GET','HEAD'].includes(req.method))return json(res,{error:'此操作不受支持。'},405);
    const dist=join(root,'dist');let file=resolve(dist,'.'+path);
    if(!file.startsWith(dist+sep) && file!==dist)return json(res,{error:'页面不存在。'},404);
    if(path==='/' || (!extname(path)&&!existsSync(file)))file=join(dist,'index.html');
    if(!existsSync(file))return json(res,{error:'应用尚未构建，请使用启动入口。'},404);
    const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png','.json':'application/json'};
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:readFileSync(file));
  }catch(e){if(!res.headersSent)json(res,{error:e.status?e.message:'操作未完成，请稍后重试。'},e.status||500);else res.end();}
});
function validDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();}
server.listen(port,'127.0.0.1',()=>console.log(`见微已启动 http://127.0.0.1:${port}`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已被占用。`:'见微启动失败。');process.exit(1);});
function shutdown(){brain.stop();for(const c of jobs.values())c.abort();for(const c of subscribers)c.end();server.close();vite?.close();store.close();process.exit(0);}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
