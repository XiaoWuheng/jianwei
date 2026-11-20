import {useEffect,useRef,useState} from 'react';
import {ArrowUp,Link2,Mic,MicOff,Plus,SlidersHorizontal,X,LoaderCircle} from 'lucide-react';
type SpeechResult={results:{isFinal:boolean;0:{transcript:string}}[];resultIndex:number};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:SpeechResult)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export default function ThoughtInput({onSend,busy=false,placeholder='想到哪里，就说到哪里。剩下的，我们一起展开。',label='帮我想一想',compact=false,draftKey,suggestion,notify}:{onSend:(value:string,reference:string,constraints:string)=>Promise<void>;busy?:boolean;placeholder?:string;label?:string;compact?:boolean;draftKey?:string;suggestion?:{value:string;key:number};notify:(s:string)=>void}){
 const savedExtras=()=>{try{return draftKey?JSON.parse(localStorage.getItem(draftKey+'-extras')||'{}'):{};}catch{return {};}};
 const [value,setValue]=useState(()=>draftKey?localStorage.getItem(draftKey)||'':''),[reference,setReference]=useState<string>(()=>savedExtras().reference||''),[constraints,setConstraints]=useState<string>(()=>savedExtras().constraints||''),[extra,setExtra]=useState(''),[sending,setSending]=useState(false),[listening,setListening]=useState(false),[interim,setInterim]=useState(''),[error,setError]=useState('');
 const ref=useRef<HTMLTextAreaElement>(null),speech=useRef<Recognition|null>(null);
 const voice=typeof window!=='undefined'&&!!((window as SpeechWindow).SpeechRecognition||(window as SpeechWindow).webkitSpeechRecognition);
 useEffect(()=>{if(draftKey)localStorage.setItem(draftKey,value);},[draftKey,value]);
 useEffect(()=>{if(draftKey)localStorage.setItem(draftKey+'-extras',JSON.stringify({reference,constraints}));},[draftKey,reference,constraints]);
 useEffect(()=>{if(suggestion){setValue(suggestion.value);ref.current?.focus();}},[suggestion]);
 useEffect(()=>()=>{if(speech.current){speech.current.onend=null;speech.current.onerror=null;speech.current.onresult=null;speech.current.abort();}},[]);
 const send=async()=>{if(!value.trim()||busy||sending||listening)return;setSending(true);setError('');try{await onSend(value.trim(),reference,constraints);setValue('');setReference('');setConstraints('');setExtra('');if(draftKey){localStorage.removeItem(draftKey);localStorage.removeItem(draftKey+'-extras');}}catch(e){setError((e as Error).message);}finally{setSending(false);}};
 const dictate=()=>{
  if(listening){speech.current?.stop();return;}
  const Constructor=(window as SpeechWindow).SpeechRecognition||(window as SpeechWindow).webkitSpeechRecognition;if(!Constructor)return;
  const rec=new Constructor();rec.lang='zh-CN';rec.continuous=true;rec.interimResults=true;
  rec.onresult=e=>{let final='',temp='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript;else temp+=e.results[i][0].transcript;}if(final)setValue(v=>v+(v&&!v.endsWith('，')?'，':'')+final);setInterim(temp);};
  rec.onerror=e=>{setListening(false);setInterim('');notify(e.error==='not-allowed'?'浏览器未获得麦克风权限，可以继续打字或使用系统语音输入。':e.error==='network'?'浏览器语音服务暂时连不上，可以使用系统语音输入或打字。':'这次语音没有识别成功，请重试或直接输入。');};
  rec.onend=()=>{setListening(false);setInterim('');};speech.current=rec;
  try{rec.start();setListening(true);}catch{notify('语音服务暂不可用，可以直接输入。');}
 };
 return <div className={'thought-input '+(compact?'compact':'')+(listening?' is-listening':'')}>
  {!compact&&<label className="input-caption" htmlFor="thought-input"><span><i/>你的想法</span><small>直接说，不用先写方案</small></label>}
  <textarea ref={ref} id={compact?'followup-input':'thought-input'} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} aria-label={compact?'继续讨论你的想法':'说出你的想法'} maxLength={12000} rows={compact?2:3} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();void send();}}}/>
  {listening&&<div className="voice-interim" role="status"><span className="voice-bars"><i/><i/><i/><i/><i/></span>{interim||'正在听你说…'}<small>识别由浏览器语音服务处理</small></div>}
  {extra&&<div className="input-extra"><label htmlFor="thought-extra">{extra==='reference'?'想参考什么？':'有什么要求？'}</label><input id="thought-extra" autoFocus placeholder={extra==='reference'?'产品名、作品、网站链接，都可以':'比如一个人做、用一个周末、预算多少'} value={extra==='reference'?reference:constraints} onChange={e=>extra==='reference'?setReference(e.target.value):setConstraints(e.target.value)} maxLength={5000}/><button onClick={()=>setExtra('')} aria-label="收起补充"><X size={15}/></button></div>}
  {error&&<p className="input-error" role="alert">{error} 你的文字已保留，可以重试。</p>}
  <div className="input-bottom"><div className="input-tools">{!compact&&<><button className={reference||extra==='reference'?'filled':''} onClick={()=>setExtra(extra==='reference'?'':'reference')} title="添加产品、作品或链接作为参考" aria-expanded={extra==='reference'}><Link2 size={15}/><span>{reference?'参考已添加':'添加参考'}</span></button><button className={constraints||extra==='constraints'?'filled':''} onClick={()=>setExtra(extra==='constraints'?'':'constraints')} title="补充时间、预算等要求" aria-expanded={extra==='constraints'}><SlidersHorizontal size={15}/><span>{constraints?'要求已添加':'补充要求'}</span></button></>}<button className={listening?'recording':''} onClick={dictate} disabled={!voice||busy} title={voice?'语音输入 · 由浏览器语音服务识别':'当前浏览器不支持语音识别，可使用系统语音输入'} aria-label={listening?'结束语音输入':'语音输入'}>{listening?<MicOff size={17}/>:<Mic size={17}/>}{!compact&&<span>{listening?'结束录音':'语音输入'}</span>}</button></div><div className="input-submit"><kbd>Ctrl ↵</kbd><button className="launch-button" disabled={!value.trim()||busy||sending||listening} onClick={()=>void send()}>{sending||busy?<LoaderCircle size={16} className="spin"/>:<ArrowUp size={17}/>}<span>{sending?'正在保存…':label}</span></button></div></div>
 </div>;
}
