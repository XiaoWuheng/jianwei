import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { reportSchema } from '../server/schema.mjs';
import {ideationSchema,blueprintSchema,memorySchema} from '../server/brain-schema.mjs';
import { validateReport, reportMarkdown } from '../server/reports.mjs';
import { openStore } from '../server/store.mjs';

function emptyFromSchema(schema){if(schema.type==='string')return schema.enum?.[0]||'待验证';if(schema.type==='array')return [];return Object.fromEntries(Object.entries(schema.properties).map(([k,v])=>[k,emptyFromSchema(v)]));}
function report(){const r=emptyFromSchema(reportSchema);r.title='研究验证';r.sources=[{id:'S1',title:'产品原始文档',url:'https://example.com/docs',publisher:'官方',type:'official',excerpt:'用于验证来源关联和导出完整性的测试资料。',reliability:'primary'}];r.insights=[{title:'可追溯的发现',body:'内容必须与来源关联。',kind:'fact',sourceIds:['S1']}];r.roadmap=[{phase:'验证',title:'先确认需求',duration:'规划估计 1 天',goal:'获得证据',tasks:['访谈目标用户','完成可交互原型'],deliverable:'访谈记录',successCriteria:'找到重复出现的问题'}];return r;}

test('unreliable imports cannot become renderable completed research',()=>{
  assert.throws(()=>validateReport({title:'破损',sources:[],roadmap:[],insights:[]}));
  const r=report();r.competitors=[{name:'不完整'}];assert.throws(()=>validateReport(r));
  const noSources=report();noSources.sources=[];assert.throws(()=>validateReport(noSources),/网络资料/);
});
test('unsafe URLs and unsupported facts are removed or downgraded',()=>{
  const r=report();r.sources.push({...r.sources[0],id:'S2',url:'javascript:alert(1)'});r.insights.push({title:'没有证据的判断',body:'不能标记为事实',kind:'fact',sourceIds:['S2','S999']});
  const clean=validateReport(r);assert.equal(clean.sources.length,1);assert.equal(clean.insights[1].kind,'hypothesis');assert.deepEqual(clean.insights[1].sourceIds,[]);
});
test('project persistence survives reopening and preserves action progress',()=>{
  const dir=mkdtempSync(join(tmpdir(),'jianwei-store-'));let store;
  try{store=openStore(dir);store.put({id:'saved-project',title:'一个想法',updatedAt:new Date().toISOString(),notes:'自己的判断',tasks:{'0-0':true}});store.close();store=openStore(dir);assert.equal(store.get('saved-project').notes,'自己的判断');assert.equal(store.get('saved-project').tasks['0-0'],true);assert.equal(store.list().length,1);}finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
test('local API preserves research across backup, import, edits and export, and rejects cross-origin writes',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'jianwei-api-'));
  const port=4389,origin=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,JIANWEI_PORT:String(port),JIANWEI_DATA_DIR:dir},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',d=>errors+=d);
  const request=async(path,method='GET',data,headers={})=>{const res=await fetch(origin+'/api'+path,{method,headers:{...(data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:data!==undefined?JSON.stringify(data):undefined});return {status:res.status,data:await res.json()};};
  try{
    let ready=false;for(let i=0;i<60;i++){try{if((await request('/health')).data.app==='jianwei'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,errors);
    assert.equal((await request('/preferences','PUT',{name:'blocked'},{Origin:'https://untrusted.example'})).status,403);
    assert.equal((await request('/projects','POST',{idea:'短'})).status,400);
    const now=new Date().toISOString();
    const project={id:'integration-test',title:'测试研究',idea:'一个有资料的测试想法',report:report(),notes:'原始笔记',tasks:{'0-0':true},savedSourceIds:['S1'],createdAt:now,updatedAt:now,completedAt:now};
    const imported=await request('/import','POST',{app:'jianwei',version:1,projects:[project]});assert.equal(imported.data.count,1);
    assert.equal((await request('/import','POST',{app:'jianwei',version:1,projects:[project]})).data.count,0);
    const all=await request('/projects');assert.equal(all.data.length,1);assert.equal(all.data[0].status,'complete');assert.equal(all.data[0].tasks['0-0'],true);
    const modified=await request('/projects/integration-test','PATCH',{notes:'更新后的思考',tasks:{'0-0':true,'0-1':true,invalid:true},archived:true});assert.equal(modified.data.notes,'更新后的思考');assert.equal(modified.data.archived,true);assert.equal(modified.data.tasks.invalid,undefined);
    const backup=await request('/backup');assert.equal(backup.data.projects[0].notes,'更新后的思考');assert.deepEqual(backup.data.projects[0].savedSourceIds,['S1']);
    await request('/projects/integration-test','PATCH',{tasks:{}});
    await Promise.all([request('/projects/integration-test','PATCH',{taskUpdate:{key:'0-0',done:true}}),request('/projects/integration-test','PATCH',{taskUpdate:{key:'0-1',done:true}})]);
    assert.equal(Object.values((await request('/projects/integration-test')).data.tasks).filter(Boolean).length,2);
    const exported=await fetch(origin+'/api/projects/integration-test/export');assert.equal(exported.status,200);const markdown=await exported.text();assert.match(markdown,/- \[x\] 完成可交互原型/);assert.match(markdown,/https:\/\/example.com\/docs/);assert.match(markdown,/更新后的思考/);
    assert.equal((await request('/projects/integration-test','DELETE',{})).status,200);assert.equal((await request('/projects')).data.length,0);
    const corrupt={...project,id:'broken',report:{title:'invalid'}};await request('/import','POST',{app:'jianwei',version:1,projects:[corrupt]});assert.equal((await request('/projects/broken')).data.status,'interrupted');
    const a=emptyFromSchema(ideationSchema);a.title='口语到书面';a.understanding='保留原始表达';a.reply='先展开，再理解';a.directions=[{id:'story',title:'内容方向',description:'一个可能',value:'表达',firstExperiment:'做一次',assumptions:[]}];
    const blueprint=emptyFromSchema(blueprintSchema);blueprint.title='制作准备';blueprint.deliverables=[{id:'d1',title:'草稿',format:'文字',description:'整理一页',acceptance:'有清晰对象'}];blueprint.milestones=[{id:'m1',title:'试做',goal:'先验证',duration:'规划估计1天',tasks:[{id:'first',title:'写一页定义',instruction:'回看原话',output:'一页文字',acceptance:'范围清晰',dependsOn:[]}]}];
    const thought={id:'thought-roundtrip',title:'口语想法',rawIdea:'这是原话，摘要不能覆盖我。',analysis:a,blueprint,messages:[{role:'user',content:'这是原话，摘要不能覆盖我。',at:now},{role:'assistant',content:'具体推演',at:now}],tasks:{first:true},versions:[{at:now,analysis:a}],blueprintVersions:[{at:now,blueprint,tasks:{first:true},evidence:'unverified'}],createdAt:now,updatedAt:now,contentAt:now,notes:'自己的笔记'};
    const memory={...emptyFromSchema(memorySchema),id:'memory-roundtrip',title:'摘要',summary:'保留出处的长期记忆',createdAt:now,sourceIds:[thought.id],batchIds:[thought.id],sourceRevisions:{[thought.id]:now},automatic:false};
    const brainBackup={app:'jianwei',version:2,projects:[],thoughts:[thought],memories:[memory],preferences:{name:'探索者',memoryAuto:false,memoryDays:30,memoryCorrections:'不自动商业化'}};
    const restored=await request('/import','POST',brainBackup);assert.equal(restored.data.thoughtCount,1);assert.equal(restored.data.memoryCount,1);assert.equal((await request('/import','POST',brainBackup)).data.memoryCount,0);
    const roundtrip=await request('/backup');assert.equal(roundtrip.data.version,2);assert.equal(roundtrip.data.thoughts[0].messages.length,2);assert.equal(roundtrip.data.thoughts[0].versions.length,1);assert.equal(roundtrip.data.thoughts[0].blueprintVersions[0].tasks.first,true);assert.equal(roundtrip.data.memories.length,1);assert.equal(roundtrip.data.memories[0].id,memory.id);
    assert.match((await request('/thoughts/'+thought.id+'/handoff')).data.text,/写一页定义/);
    await request('/import','POST',{app:'jianwei',version:1,projects:[],preferences:{name:'旧版偏好'}});assert.equal((await request('/preferences')).data.memoryCorrections,'不自动商业化');assert.equal((await request('/preferences')).data.memoryAuto,false);assert.equal((await request('/preferences')).data.memoryDays,30);
  }finally{child.kill();await Promise.race([once(child,'close'),new Promise(r=>setTimeout(r,2000))]);rmSync(dir,{recursive:true,force:true});}
});
