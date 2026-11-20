import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { reportSchema, chatSchema } from './schema.mjs';
import { ideationSchema, blueprintSchema, memorySchema } from './brain-schema.mjs';
const runFile = promisify(execFile);
let executable;
function transportArguments(){
  // Application-scoped HTTPS transport avoids a long reconnect loop on compatible gateways.
  // Only inspect the provider identifier; never copy or print authentication configuration.
  if(process.env.JIANWEI_USE_WEBSOCKETS==='1')return [];
  try{const config=readFileSync(join(process.env.CODEX_HOME||join(homedir(),'.codex'),'config.toml'),'utf8');const root=config.split(/^\s*\[/m)[0];const provider=root.match(/^\s*model_provider\s*=\s*["']([a-zA-Z0-9_-]+)["']/m)?.[1];if(provider&&provider!=='openai')return ['-c',`model_providers.${provider}.supports_websockets=false`];}catch{}
  return [];
}
export async function findCodex() {
  if (executable && existsSync(executable)) return executable;
  for (const candidate of [process.env.JIANWEI_CODEX_PATH,process.env.CODEX_APP_RUNTIME_CLI_PATH]) {
    if (candidate && isAbsolute(candidate) && existsSync(candidate) && /codex(?:\.exe)?$/i.test(candidate)) return executable=candidate;
  }
  try {
    const {stdout} = await runFile(process.platform==='win32'?'where.exe':'which',['codex'],{windowsHide:true,timeout:7000});
    const found=stdout.trim().split(/\r?\n/).find(p=>existsSync(p) && (process.platform!=='win32' || /\.exe$/i.test(p)));
    if(found) return executable=found;
  } catch {}
  if (process.platform==='win32') {
    // App Store versions have a versioned executable path; a reinstall should keep the launcher working.
    try {
      const {stdout}=await runFile('powershell.exe',['-NoProfile','-Command',"(Get-Command codex.exe -ErrorAction Stop).Source"],{windowsHide:true,timeout:7000});
      if(existsSync(stdout.trim())) return executable=stdout.trim();
    } catch {}
    try {
      const {stdout}=await runFile('powershell.exe',['-NoProfile','-Command',"$package = Get-AppxPackage -Name OpenAI.Codex -ErrorAction Stop | Select-Object -First 1; if ($package) { Join-Path $package.InstallLocation 'app\\resources\\codex.exe' }"],{windowsHide:true,timeout:12000});
      if(stdout.trim() && existsSync(stdout.trim())) return executable=stdout.trim();
    } catch {}
  }
  throw new Error('未找到研究引擎。请安装并登录 Codex，然后点击重新检测。');
}
export async function engineHealth() {
  try {
    const bin=await findCodex();
    const {stdout,stderr}=await runFile(bin,['login','status'],{windowsHide:true,timeout:12000,maxBuffer:100000});
    const logged=/logged in/i.test(stdout+'\n'+stderr);
    return {available:logged, engine:'Codex', label:logged?'研究引擎已连接':'研究引擎需要登录', detail:logged?'沿用本机 Codex 配置与认证，支持实时联网检索。额度与费用取决于当前使用的服务。':'请在 Codex 中完成登录后重新检测。'};
  } catch(e) {return {available:false,engine:'Codex',label:'研究引擎未就绪',detail:e.message.includes('未找到')?e.message:'请确认 Codex 已安装并登录，然后重新检测。'};}
}
export function runResearch({directory, prompt, kind='research', onEvent, signal, depth='standard'}) {
  return new Promise(async (resolve,reject)=>{
    let child,timeout,settled=false,buffer='',stderr='',lastMessage='',failure='',searchCount=0;
    const runId=randomUUID(),runDirectory=join(directory,'runs',runId);
    const finish=(err,value)=>{
      if(settled) return;
      settled=true;clearTimeout(timeout);signal?.removeEventListener('abort',abort);
      try{rmSync(runDirectory,{recursive:true,force:true});}catch{}
      err?reject(err):resolve(value);
    };
    const abort=()=>{if(child) child.kill();finish(new Error('研究已停止，已找到的检索记录仍然保留。'));};
    try {
      const bin=await findCodex();
      if(signal?.aborted) return finish(new Error('研究已停止。'));
      mkdirSync(runDirectory,{recursive:true});
      const schemaPath=join(runDirectory,'schema.json'),outputPath=join(runDirectory,'result.json');
      writeFileSync(schemaPath,JSON.stringify(({chat:chatSchema,ideation:ideationSchema,blueprint:blueprintSchema,memory:memorySchema})[kind]||reportSchema));
      const env={...process.env};
      for(const key of ['CODEX_THREAD_ID','CODEX_SESSION_ID','CODEX_TOOL_CALL_ID','CODEX_TASK_WORKSPACE_VERIFYING_IDENTITY','CODEX_INTERNAL_ORIGINATOR_OVERRIDE','CODEX_APP_TOOLS_PIPE_PATH']) delete env[key];
      const args=['exec','--json','--ephemeral','--skip-git-repo-check','--color','never','-s','read-only','-c',`web_search="${['ideation','blueprint','memory'].includes(kind)?'disabled':'live'}"`,'-c','features.multi_agent=false','-c','features.apps=false','-c','features.plugins=false',...transportArguments(),'--output-schema',schemaPath,'--output-last-message',outputPath,'-C',runDirectory,'-'];
      child=spawn(bin,args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
      signal?.addEventListener('abort',abort,{once:true});
      timeout=setTimeout(()=>{child.kill();finish(new Error('本次处理超过时间上限。可以缩小问题后重试，原始输入与已有结果已保留。'));},(['chat','ideation'].includes(kind)?8:['blueprint','memory'].includes(kind)?12:depth==='deep'?35:22)*60*1000);
      const parseLine=line=>{
        let event;try{event=JSON.parse(line);}catch{return;}
        const item=event.item;
        if(event.type==='turn.failed') failure=event.error?.message||'研究引擎未完成本次研究。';
        if(event.type==='error') {failure=event.message||failure;if(/reconnect/i.test(event.message||''))onEvent?.({type:'progress',message:'思维服务连接不稳定，正在重新连接。原话和已有结果仍然保留。'});}
        if(event.type==='thread.started') onEvent?.({type:'connected',message:kind==='ideation'?'已连接思维引擎，正在理解与展开你的想法':kind==='blueprint'?'正在将思考整理为可执行蓝图':kind==='memory'?'正在整理长期记忆':'已建立研究会话，正在展开检索'});
        if(item && ['item.started','item.completed'].includes(event.type) && item.type==='web_search') {
          if(event.type==='item.completed')searchCount++;
          onEvent?.({type:'search',message:item.query || item.action?.query || (item.action?.queries||[]).join(' · ') || item.action?.url || '查阅网络资料',count:searchCount,completed:event.type==='item.completed'});
        }
        if(item?.type==='agent_message' && event.type==='item.completed') {
          const message=item.text||'';
          if(message.trim().startsWith('{')) lastMessage=message;
          else onEvent?.({type:'progress',message:message.slice(0,1200)});
        }
        if(event.type==='turn.completed') onEvent?.({type:'compiling',message:['ideation','blueprint','memory'].includes(kind)?'正在整理思考结果':'正在整理证据与研究结论',usage:event.usage});
      };
      child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
      child.stdout.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){parseLine(buffer.slice(0,i));buffer=buffer.slice(i+1);} if(buffer.length>5000000){child.kill();finish(new Error('研究返回内容过大，请重试。'));}});
      child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-5000);});
      child.on('error',e=>finish(new Error(`研究引擎无法启动：${e.message}`)));
      child.on('close',code=>{
        if(settled)return;
        if(buffer.trim())parseLine(buffer);
        if(code!==0) {
          const detail=failure||stderr;
          const message=/usage limit|rate.limit|quota|exceeded/i.test(detail)?'当前研究账户额度不足或请求过于频繁，请稍后重试。':/auth|login|unauthorized|401/i.test(detail)?'研究引擎登录已失效，请在 Codex 中重新登录。':/connection|network|stream disconnected|timed out/i.test(detail)?'研究服务连接中断，请检查网络后重试。':'研究引擎未能完成本次研究，请稍后重试。';
          return finish(new Error(message));
        }
        try {
          const raw=existsSync(outputPath)?readFileSync(outputPath,'utf8'):lastMessage;
          const result=JSON.parse(raw.replace(/^```json\s*|\s*```$/g,''));
          if(kind==='research' && searchCount===0) return finish(new Error('未检测到实际联网检索，未将结果保存为已完成研究。请重试。'));
          finish(null,{result,searchCount});
        } catch {finish(new Error('研究结果未能整理成完整报告，请重试。'));}
      });
      child.stdin.on('error',()=>{});child.stdin.end(prompt);
    } catch(e){finish(e);}
  });
}
