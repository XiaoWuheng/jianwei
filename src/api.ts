export async function api<T>(path:string,method='GET',data?:unknown):Promise<T>{
  let res:Response;
  try {res=await fetch('/api'+path,{method,headers:data!==undefined?{'Content-Type':'application/json'}:undefined,body:data!==undefined?JSON.stringify(data):undefined});}
  catch {throw new Error('暂时连接不上见微，请确认应用仍在运行。');}
  const value=await res.json();if(!res.ok)throw new Error(value.error||'操作未完成，请重试。');return value;
}
export function safeLink(url:string){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}}
export function domain(url:string){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '来源';}}
export function date(value:string){return new Date(value).toLocaleDateString('zh-CN',{month:'long',day:'numeric',timeZone:'Asia/Shanghai'});}
export const typeLabels:Record<string,string>={official:'产品官网',repository:'开源仓库',community:'社区讨论',research:'论文研究',market:'行业资料',media:'媒体报道',appstore:'产品发现'};
export const modeLabels:Record<string,string>={full:'完整探索',competitor:'竞品与对标',market:'市场与需求',build:'技术与落地'};
