import {useEffect,type RefObject} from 'react';

export default function useConversationScroll(ref:RefObject<HTMLDivElement|null>,messages:{id:string;role:string}[],pending:boolean|undefined,sceneKey=''){
 const last=messages.at(-1);
 const reply=messages.filter(m=>m.role==='assistant').at(-1);
 useEffect(()=>{
  let cancelled=false,frame=0;
  const showLatest=()=>{
   const element=ref.current;if(cancelled||!element)return;
   const latest=reply&&element.querySelector<HTMLElement>(`[data-message-id="${reply.id}"]`);
   element.scrollTop=latest&&!pending?latest.offsetTop:element.scrollHeight;
  };
  frame=requestAnimationFrame(showLatest);
  void document.fonts.ready.then(()=>{if(!cancelled){cancelAnimationFrame(frame);frame=requestAnimationFrame(showLatest);}});
  return()=>{cancelled=true;cancelAnimationFrame(frame);};
 },[last?.id,reply?.id,pending,sceneKey]);
}
