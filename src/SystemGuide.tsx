import {useState} from 'react';
import {ArrowRight,ArrowUpRight,BrainCircuit,Check,Compass,FileText,GitBranch,Globe2,Layers3,Orbit,ScanLine,Sparkles} from 'lucide-react';
import {External} from './components';
const references=[
 {title:'AKARI / Lusion',kind:'光与材质',url:'https://akari.lusion.co/',learn:'已打开实际演示，观察光条、遮挡与柔和照明。学习让光附着于物体：见微的鼠标反馈落在按钮和输入区的材质上，空白保持安静。'},
 {title:'Active Theory',kind:'实时场景与镜头',url:'https://activetheory.net/',learn:'已打开实时场景，观察金属高光、光带和景深颗粒。借鉴大面积暗面与少量亮点的关系，让主体和操作区各有清楚的视觉位置。'},
 {title:'WebGL Black Hole / Bruno Simon',kind:'空间光学与体积',url:'https://github.com/brunosimon/webgl-black-hole',learn:'已打开实际演示并查看渲染组织，学习柔软盘面、局部亮斑与前后遮挡。该仓库标注 UNLICENSED；见微的图形独立编写，未复制其代码。'},
 {title:'React Bits / Liquid Ether',kind:'流动与性能取舍',url:'https://reactbits.dev/backgrounds/liquid-ether',learn:'已实际操作流体演示，观察运动与消散。将流动留给开场和环境，让日常输入与阅读保持安静；没有把全屏流体拖尾作为常驻鼠标效果。'},
 {title:'Codrops / WebGPU Gommage',kind:'粒子与文字的连续演化',url:'https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/',learn:'查阅文字消散与粒子同步的分步教程。见微独立制作粒子成字、流入星盘、镜头移向输入区的连续开场，始终可以跳过。'},
 {title:'Spatial HUD',kind:'空间环境与交互实现',url:'https://github.com/nitishhansa1/spatial-hud',learn:'实读场景、体积粒子和网格环境实现，学习景深、前后关系与图形计算。见微的节点使用实际方向、来源和任务，没有把演示用性能仪表作为功能。'},
 {title:'JavaScript Black Hole',kind:'奇点与吸积盘层次',url:'https://github.com/flightlesstux/javascript-blackhole',learn:'查阅视界、盘面材质和渲染组织。见微以独立编写的程序图形形成明暗、遮挡和流动层次，这是一种界面视觉，不作为科学仿真。'},
 {title:'AFFiNE',kind:'同一内容的不同视角',url:'https://github.com/toeverything/AFFiNE',learn:'参考同一份内容可以在不同视角中延展的组织思路。见微让对话、方向、研究与计划属于同一个想法，避免进入互不相连的工具。'},
 {title:'Open Deep Research',kind:'研究阶段与出处保留',url:'https://github.com/langchain-ai/open_deep_research',learn:'查阅研究、压缩、报告等阶段的组织，保留真实来源和任务归属。见微继续使用本机现有引擎，没有安装或运行该项目。'},
 {title:'GMUNK / Oblivion GFX',kind:'原制作团队视觉方法',url:'https://gmunk.com/OBLIVION-GFX',learn:'学习以功能和统一视觉语言支撑科幻质感，区分主体、暗面、投影与操作区域。已查看公开制作说明与 Light Table 实图，不把电影道具的遥测密度照搬给新手。'},
 {title:'NN/g / 渐进展示',kind:'易用性原则',url:'https://www.nngroup.com/articles/progressive-disclosure/',learn:'把直接表达作为起点；研究、计划、完整记录在需要时出现。重要动作保持可见，功能名称使用普通中文。'},
 {title:'Google / NotebookLM 入门',kind:'真实任务引导',url:'https://blog.google/innovation-and-ai/products/notebooklm-beginner-tips/',learn:'参考起始问题和任务附近的建议，使用示例起句和可回答的问题帮助用户开始。这里只借鉴引导方式，不接入该服务。'},
 {title:'Territory / Marvel’s Avengers',kind:'电影与游戏全息设计',url:'https://territorystudio.com/project/marvelsavengersgame/',learn:'查看制作团队的全息界面案例，学习透明层次、内容片段与空间关联；见微以局部信息片围绕当前对象展开。'},
 {title:'Iron Man II / UI & Holograms',kind:'原制作团队案例',url:'https://projectsbyilya.com/Iron-Man-II-U-I-Holograms',learn:'查阅原制作团队的项目说明与概念入口。部分图像访问受限，未把不可访问内容声称为已看完。'},
 {title:'Barehands',kind:'空间交互',url:'https://github.com/jaredrhod/barehands',learn:'借鉴空间组织思路，见微以点击具体内容对象展开局部片段；未复制其 AGPL 代码。'},
 {title:'Jarvis UI',kind:'立体光效',url:'https://github.com/kariimmoalla1-source/jarvis-ui',learn:'学习立体核心、不同倾角轨道、粒子与前后层次，采用独立的轻量 3D 场景。'},
 {title:'Arwes',kind:'科幻界面',url:'https://github.com/arwes/arwes',learn:'学习细框、切角与渐进显现。仓库已注明停止维护，界面由见微独立实现。'},
 {title:'Flowith Canvas',kind:'分支思考',url:'https://flowith.io/tools/canvas/',learn:'把方向、对话和参照放在可理解的空间里，沿分支继续，也能重新收敛。'},
 {title:'Heptabase',kind:'理解与组织',url:'https://wiki.heptabase.com/work-with-ai',learn:'学习把有价值的思考从线性对话整理成结构，既能看全局，也能回到具体内容。'},
 {title:'Tana',kind:'口语到结构',url:'https://outliner.tana.inc/learn/features/tana-mobile',learn:'学习快速捕捉和结构化整理，并保留原始表达，允许修正与重新理解。'},
 {title:'Hindsight',kind:'记忆架构',url:'https://github.com/vectorize-io/hindsight',learn:'参考保留、召回、反思的分层思路。见微使用本机记录、相关记忆检索与累计摘要，未接入该项目服务。'},
 {title:'AI Memory Vault',kind:'长期记忆',url:'https://github.com/jaredrhod/ai-memory-vault',learn:'学习外部持久记忆与按任务选取上下文，避免把所有历史塞进每次对话。'},
 {title:'Awesome AI Second Brain',kind:'产品架构比较',url:'https://github.com/aristoapp/awesome-second-brain',learn:'从捕捉、组织、演化、使用和可检查性五个环节检查完整链路。'},
 {title:'Meco 创作者分享',kind:'中文公开分享',url:'https://www.douyin.com/video/7692744033814516402',learn:'公开文字说明强调从自然表达走向可用成果；见微将口语、研究与制作任务书连起来。此处参考公开页面文字。'},
 {title:'Homerail 创作者分享',kind:'中文公开分享',url:'https://www.douyin.com/video/7660026038541405450',learn:'公开分享及反馈提示：流程可见、关键选择清楚和开箱可用，比演示规模更重要。此处参考公开文字，未验证其项目能力。'},
];
export default function SystemGuide({navigate}:{navigate:(s:string)=>void}){
 const [tab,setTab]=useState('principles');
 return <div className="system-guide"><header><span className="hud-label">JIANWEI / FIELD NOTES</span><h1>让念头自由生长，<br/><em>也能走进现实。</em></h1><p>见微是一处可以长期回来的思考空间。</p></header><nav className="guide-tabs">{[['principles','相处的方式'],['journey','如何开始'],['references','学习与参照']].map(([id,label])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav>{tab==='principles'?<div className="guide-principles">{[{Icon:Orbit,title:'念头先留下，形式可以晚一点。',body:'半句话、一种感受、两个看似无关的东西，都值得展开。不把所有想法都变成 App，不急着给它命名。'},{Icon:GitBranch,title:'允许发散，也允许改变主意。',body:'先看多种可能，沿喜欢的分支深入；新的理解不会抹去最初的原话。过去的版本可以回来再看。'},{Icon:Globe2,title:'想象大胆，依据诚实。',body:'外部问题去真实查证。事实、推断与假设各有位置。未知就保留未知，不用漂亮的数字假装确定。'},{Icon:Layers3,title:'记忆积累，思考轻装。',body:'把反复关注的主题与未解问题沉淀为摘要，按需唤起相关记录。摘要不是遗忘，原始出处仍在。'},{Icon:ScanLine,title:'最后留下一个能做的下一步。',body:'想法可以成为内容、体验、服务、研究或产品。形成具体成果、交付物、任务和验收，再交给你与制作工具继续。'}].map(x=><article key={x.title}><x.Icon size={22}/><div><h2>{x.title}</h2><p>{x.body}</p></div></article>)}</div>:tab==='journey'?<div className="guide-journey">{[['01','说出一个想法','在首页直接输入，点「帮我想一想」。不用先选工具，一句话也可以。','home'],['02','一起聊，再看方向','打开同一个想法，在「继续聊」补充表达，在「看方向」比较不同可能。','memory'],['03','在这个想法里查资料','点「联网研究」寻找对标、案例与实现资源。研究和来源都留在同一个想法里。','memory'],['04','按步骤做出来','点「行动计划」整理步骤、成果与完成标准。可勾选进度，也可复制「执行说明」交给合作者。','memory']].map(([n,title,body,page])=><button key={n} onClick={()=>navigate(page)}><span>{n}</span><div><h2>{title}</h2><p>{body}</p></div><ArrowUpRight size={17}/></button>)}</div>:<div className="guide-references"><p className="guide-reference-intro">参考产品机制与公开实现，结合见微的实际能力独立设计。公开分享中的演示与宣传不作为能力保证。</p>{references.map(r=><article key={r.url}><span>{r.kind}</span><External url={r.url}><h2>{r.title}</h2><ArrowUpRight size={16}/></External><p>{r.learn}</p></article>)}<p className="guide-coverage-note">本轮也检索了小红书和哔哩哔哩。没有取得足够相关、完整且可核实的内容，因此未把它们列成已经学习的视频。抖音参考限于可读取的公开文字，未声称逐帧观看视频。</p><div className="guide-font-credit">界面使用 Severin Meyer 的 Oxanium 字体，并在系统安装了小米 MiSans 时优先使用该中文字体。<External url="https://hyperos.mi.com/font/zh">MiSans</External><External url="https://github.com/sevmeyer/oxanium">Oxanium</External></div></div>}</div>;
}
