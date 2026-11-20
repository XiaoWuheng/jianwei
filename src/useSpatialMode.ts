import {useEffect,useState} from 'react';
export default function useSpatialMode(){
 const [spatial,setSpatial]=useState(()=>matchMedia('(min-width: 700px) and (min-height: 520px)').matches);
 useEffect(()=>{const q=matchMedia('(min-width: 700px) and (min-height: 520px)'),update=()=>setSpatial(q.matches);q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
 return spatial;
}
