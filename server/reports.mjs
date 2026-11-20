import { reportSchema } from './schema.mjs';
export function safeUrl(value) { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
export function matchesSchema(value,schema){
  if(schema.type==='string')return typeof value==='string' && value.length<=200000 && (!schema.enum||schema.enum.includes(value));
  if(schema.type==='array')return Array.isArray(value)&&value.length<=2000&&value.every(item=>matchesSchema(item,schema.items));
  if(schema.type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value)&&schema.required.every(key=>Object.hasOwn(value,key)&&matchesSchema(value[key],schema.properties[key]))&&Object.keys(value).every(key=>Object.hasOwn(schema.properties,key));
  return false;
}
export function validateReport(report) {
  if (!matchesSchema(report,reportSchema) || !['title','summary','recommendation','nextAction'].every(key=>report[key].trim()) || !report.roadmap.length) throw new Error('研究结果不完整，请重试。');
  const seen = new Set();
  report.sources = report.sources.filter(s=>s && typeof s.id==='string' && !seen.has(s.id) && safeUrl(s.url) && (seen.add(s.id),true)).map(s=>({...s,url:safeUrl(s.url)}));
  if (!report.sources.length) throw new Error('这次没有取得可引用的网络资料。请检查联网状态后重试；未将推测保存为已完成研究。');
  for (const items of [report.insights,report.competitors,report.benchmarks,report.repositories,report.market?.signals]) {
    for (const item of items || []) { item.sourceIds = (item.sourceIds || []).filter(id=>seen.has(id)); if (item.url) item.url=safeUrl(item.url); if (item.kind==='fact' && !item.sourceIds.length) item.kind='hypothesis'; }
  }
  return report;
}
export function reportMarkdown(p) {
  const r=p.report;
  if (!r) return `# ${p.title}\n\n${p.idea}\n\n研究尚未完成。`;
  const cite = (ids) => (ids||[]).map(id=>{const s=r.sources.find(x=>x.id===id);return s ? `[${id}](${s.url})` : '';}).filter(Boolean).join(' ');
  const bullets = arr => (arr||[]).map(x=>`- ${x}`).join('\n');
  return `# ${r.title}\n\n${r.subtitle}\n\n> 研究时间：${new Date(p.completedAt||p.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}（Asia/Shanghai）\n> 研究输入：${p.idea}\n> 对标：${p.reference||'自动发现'}\n> 限制：${p.constraints||'未指定'}\n\n## 结论\n\n${r.summary}\n\n${r.recommendation}\n\n**下一步：** ${r.nextAction}\n\n## 想法定位\n\n**目标用户：** ${r.audience}\n\n**核心问题：** ${r.problem}\n\n**价值主张：** ${r.valueProposition}\n\n## 关键发现\n\n${r.insights.map(i=>`### ${i.title}\n\n${({fact:'已查证',inference:'推断',hypothesis:'待验证'})[i.kind]} · ${cite(i.sourceIds)}\n\n${i.body}`).join('\n\n')}\n\n## 竞品比较\n\n${r.competitors.map(c=>`### [${c.name}](${c.url})\n\n${c.tagline}\n\n目标用户：${c.audience}\n\n定价：${c.pricing}\n\n优势：\n${bullets(c.strengths)}\n\n机会与不足：\n${bullets(c.gaps)}\n\n可借鉴：${c.learnFrom}\n\n${cite(c.sourceIds)}`).join('\n\n')}\n\n## 对标学习\n\n${r.benchmarks.map(b=>`### [${b.name}](${b.url})\n\n${b.positioning}\n\n用户路径：\n${bullets(b.userJourney)}\n\n核心功能：\n${bullets(b.features)}\n\n商业模式：${b.monetization}\n\n值得学习：\n${bullets(b.learn)}\n\n应避免：\n${bullets(b.avoid)}\n\n${cite(b.sourceIds)}`).join('\n\n')}\n\n## 市场与需求\n\n${r.market.overview}\n\n${r.market.signals.map(s=>`### ${s.title}\n\n${s.body}\n\n${cite(s.sourceIds)}`).join('\n\n')}\n\n切入点：${r.market.entryPoint}\n\n风险：\n${bullets(r.market.risks)}\n\n## 开源参照\n\n${r.repositories.map(repo=>`### [${repo.name}](${repo.url})\n\n${repo.description}\n\n许可证：${repo.license}\n\n技术：${repo.stack.join(' / ')}\n\n适用方式：${repo.application}\n\n注意：${repo.caution}\n\n${cite(repo.sourceIds)}`).join('\n\n') || '本次未找到适用且已查证的开源项目。'}\n\n## 落地路线\n\n${r.roadmap.map((s,si)=>`### ${s.phase} · ${s.title}\n\n时间估计：${s.duration}\n\n${s.goal}\n\n${s.tasks.map((t,ti)=>`- [${p.tasks?.[`${si}-${ti}`]?'x':' '}] ${t}`).join('\n')}\n\n交付物：${s.deliverable}\n\n通过标准：${s.successCriteria}`).join('\n\n')}\n\n## 待验证假设\n\n${r.assumptions.map(a=>`### ${a.assumption}\n\n优先级：${a.priority}\n\n验证方式：${a.test}\n\n通过标准：${a.passCriteria}`).join('\n\n')}\n\n## 检索覆盖\n\n${r.coverage.map(c=>`- **${c.channel}**（${c.status}）：${c.result}\n  - 检索词：${c.queries.join('；')}`).join('\n')}\n\n## 研究边界\n\n${bullets(r.limitations)}\n\n## 来源\n\n${r.sources.map(s=>`- **${s.id}** [${s.title}](${s.url}) · ${s.publisher}\n  - ${s.excerpt}`).join('\n')}\n\n## 我的笔记\n\n${p.notes || '暂无笔记'}\n\n---\n由见微整理。事实、推断与假设请结合原始来源判断。`;
}
