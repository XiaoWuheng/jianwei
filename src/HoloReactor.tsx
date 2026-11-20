import {useEffect,useRef,useState} from 'react';
import {diskFragment,diskVertex,rimFragment,rimVertex,streamFragment,streamVertex} from './visuals/singularity';
import {createThoughtBirth} from './visuals/thoughtBirth';

export default function HoloReactor({busy=false}:{busy?:boolean}){
 const host=useRef<HTMLDivElement>(null),activity=useRef(busy),[ready,setReady]=useState(false);
 useEffect(()=>{activity.current=busy;},[busy]);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let alive=true,dispose=()=>{};
  async function create(){
   try{
    const T=await import('three');if(!alive)return;
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.domElement.setAttribute('aria-hidden','true');element!.appendChild(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.1,60);
    camera.position.set(0,2.5,7);camera.lookAt(0,0,0);
    const field=new T.Group();field.rotation.z=-.18;scene.add(field);
    const horizon=new T.Mesh(new T.SphereGeometry(.705,64,48),new T.MeshBasicMaterial({color:0x010205}));field.add(horizon);
    const halo=new T.Mesh(new T.SphereGeometry(.735,64,48),new T.ShaderMaterial({vertexShader:rimVertex,fragmentShader:rimFragment,uniforms:{strength:{value:.6}},transparent:true,depthWrite:false,blending:T.AdditiveBlending}));field.add(halo);
    const outerHalo=new T.Mesh(new T.SphereGeometry(.87,48,36),new T.ShaderMaterial({vertexShader:rimVertex,fragmentShader:rimFragment,uniforms:{strength:{value:.075}},transparent:true,depthWrite:false,blending:T.AdditiveBlending}));field.add(outerHalo);
    const photon=new T.Mesh(new T.TorusGeometry(.714,.003,8,240),new T.MeshBasicMaterial({color:0xffeccf,transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false}));photon.quaternion.copy(camera.quaternion);field.add(photon);
    const lightUniforms={time:{value:0},activity:{value:.3},opacity:{value:1.}};
    const gasMaterial=new T.ShaderMaterial({vertexShader:diskVertex,fragmentShader:diskFragment,uniforms:lightUniforms,side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    const diskGeometry=new T.RingGeometry(.72,2.65,256,40);
    const disk=new T.Mesh(diskGeometry,gasMaterial);disk.rotation.x=-Math.PI/2;field.add(disk);
    const mistMaterial=gasMaterial.clone();mistMaterial.uniforms.opacity.value=.17;
    const mist=new T.Mesh(diskGeometry.clone(),mistMaterial);mist.rotation.x=-Math.PI/2;mist.position.y=.035;mist.scale.setScalar(1.08);field.add(mist);
    const positions=new Float32Array(5200*3),seeds=new Float32Array(5200);
    for(let i=0;i<5200;i++){const seed=((i*73.193)%997)/997,r=.84+Math.pow(seed,.75)*2.7,a=i*2.399963;positions.set([Math.cos(a)*r,Math.sin(i*19.19)*.025*(r-.5),Math.sin(a)*r],i*3);seeds[i]=((i*39.173)%991)/991;}
    const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(positions,3));dustGeometry.setAttribute('seed',new T.BufferAttribute(seeds,1));
    const dustMaterial=new T.ShaderMaterial({vertexShader:streamVertex,fragmentShader:streamFragment,uniforms:lightUniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending});field.add(new T.Points(dustGeometry,dustMaterial));
    const distantPositions=new Float32Array(1800*3);
    for(let i=0;i<1800;i++){const a=i*2.399963,r=5+((i*17.13)%101)/8;distantPositions.set([Math.cos(a)*r,Math.sin(a)*r*.55,-4-((i*11.57)%13)],i*3);}
    const distantGeometry=new T.BufferGeometry();distantGeometry.setAttribute('position',new T.BufferAttribute(distantPositions,3));const stars=new T.Points(distantGeometry,new T.PointsMaterial({size:.014,color:0xa4d9ef,transparent:true,opacity:.6,depthWrite:false}));scene.add(stars);
    const birth=createThoughtBirth(T,camera);scene.add(birth.actor);let birthAt:number|null=null;
    let raf=0,last=0,elapsed=0,inView=true,visible=!document.hidden,slowFrames=0,pixelRatio=Math.min(devicePixelRatio||1,1.25);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const resize=()=>{const r=element!.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();birth.uniforms.pixelRatio.value=pixelRatio;const glyphPixels=r.height*4.2/(2*camera.position.length()*Math.tan(T.MathUtils.degToRad(camera.fov/2)));birth.actor.scale.setScalar(Math.min(1,Math.min(innerWidth*.78,620)/glyphPixels));if(reduced.matches)renderer.render(scene,camera);};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element!);resize();
    const frame=(now:number)=>{
     if(!alive)return;const dt=Math.min(now-last,60);last=now;
     if(!reduced.matches){elapsed+=dt/1000;field.rotation.x=Math.sin(elapsed*.08)*.025;stars.rotation.z=elapsed*.0015;}
     lightUniforms.time.value=elapsed;lightUniforms.activity.value=activity.current?1:.3;mistMaterial.uniforms.time.value=elapsed;
     if(birthAt!==null){const age=(now-birthAt)/1000;birth.uniforms.time.value=age;const p=T.MathUtils.smoothstep(age,3.35,4.85);field.scale.setScalar(Math.max(.0001,p));if(age>5.3)birth.actor.visible=false;}
     renderer.render(scene,camera);
     if(dt>34)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
     if(slowFrames>90&&pixelRatio>.85){pixelRatio=Math.max(.85,pixelRatio-.15);renderer.setPixelRatio(pixelRatio);resize();slowFrames=0;}
     if(inView&&visible&&!reduced.matches)raf=requestAnimationFrame(frame);
    };
    const wake=()=>{visible=!document.hidden;cancelAnimationFrame(raf);if(visible&&inView){last=performance.now();raf=requestAnimationFrame(frame);}};
    const intersectionObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;wake();});intersectionObserver.observe(element!);
    const startBirth=()=>{if(reduced.matches||!birth.prepare())return;element!.dataset.particleTitle='true';birthAt=performance.now();birth.actor.visible=true;birth.uniforms.time.value=0;field.scale.setScalar(.0001);};
    const stopBirth=()=>{birthAt=null;birth.actor.visible=false;field.scale.setScalar(1);delete element!.dataset.particleTitle;};
    document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);
    window.addEventListener('jianwei-cinema-start',startBirth);window.addEventListener('jianwei-cinema-stop',stopBirth);
    const lost=()=>setReady(false);renderer.domElement.addEventListener('webglcontextlost',lost);
    birth.actor.visible=true;renderer.compile(scene,camera);renderer.render(scene,camera);birth.actor.visible=false;raf=requestAnimationFrame(frame);setReady(true);window.dispatchEvent(new Event('jianwei-scene-ready'));
    dispose=()=>{cancelAnimationFrame(raf);resizeObserver.disconnect();intersectionObserver.disconnect();window.removeEventListener('jianwei-cinema-start',startBirth);window.removeEventListener('jianwei-cinema-stop',stopBirth);document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(object=>{const mesh=object as InstanceType<typeof T.Mesh>;mesh.geometry?.dispose();if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();});renderer.dispose();renderer.domElement.remove();};
   }catch{if(alive)setReady(false);}
  }
  void create();return()=>{alive=false;dispose();};
 },[]);
 return <div ref={host} className={'holo-volume singularity-volume '+(ready?'webgl-ready':'')}><svg className="holo-fallback" viewBox="0 0 600 600" fill="none" aria-hidden="true"><defs><radialGradient id="singularity-glow"><stop offset=".55" stopColor="#060b13"/><stop offset=".6" stopColor="#e7f6ff"/><stop offset=".62" stopColor="#c4d9ed" stopOpacity=".3"/><stop offset="1" stopColor="#6ca1c7" stopOpacity="0"/></radialGradient></defs><circle cx="300" cy="300" r="130" fill="url(#singularity-glow)"/><ellipse cx="300" cy="300" rx="235" ry="60" transform="rotate(-15 300 300)" stroke="#8ebfdb" strokeWidth="12" strokeOpacity=".18"/><ellipse cx="300" cy="300" rx="183" ry="44" transform="rotate(-15 300 300)" stroke="#e8d5b4" strokeWidth="3" strokeOpacity=".7"/></svg></div>;
}
