import type * as Three from 'three';

// One transient actor in the existing scene. Its particles are decoration, not memories.
export function createThoughtBirth(T:typeof Three,camera:Three.Camera){
 const count=6200,positions=new Float32Array(count*3),letters=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){
  const seed=((i*73.193+17)%997)/997,a=i*2.399963,r=2.8+seed*4;
  positions.set([Math.cos(a)*r,Math.sin(a)*r*.65,(seed-.5)*5],i*3);seeds[i]=seed;
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 geometry.setAttribute('letter',new T.BufferAttribute(letters,3));
 geometry.setAttribute('seed',new T.BufferAttribute(seeds,1));
 const uniforms={time:{value:0},pixelRatio:{value:1}};
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,uniforms,
  vertexShader:`
   uniform float time;uniform float pixelRatio;
   attribute vec3 letter;attribute float seed;
   varying float alpha;varying float warmth;
   void main(){
    float arrive=smoothstep(.28+seed*.45,1.85+seed*.25,time);
    float depart=smoothstep(3.05+seed*.28,4.7+seed*.22,time);
    vec3 free=position;
    free.xy+=vec2(sin(time*.8+seed*25.),cos(time*.6+seed*19.))*.3;
    vec3 glyph=letter+vec3(0.,0.,sin(seed*62.+time)*.025);
    vec3 p=mix(free,glyph,arrive);
    float a=seed*125.6637+time*.12;
    float r=.9+fract(seed*19.17)*1.85;
    vec3 orbit=vec3(cos(a)*r,sin(a)*r*.26,sin(a)*r*.3);
    p=mix(p,orbit,depart);
    p.xy+=vec2(sin(seed*33.+depart*4.),cos(seed*27.+depart*3.))*sin(depart*3.14159)*.45;
    vec4 view=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*view;
    gl_PointSize=(1.6+seed*1.7)*pixelRatio;
    alpha=smoothstep(.12,.85,time)*(1.-smoothstep(4.45,5.2,time));
    alpha*=mix(.3,1.12,arrive)*(.8+.2*sin(seed*56.+time));
    warmth=seed;
   }
  `,
  fragmentShader:`
   varying float alpha;varying float warmth;
   void main(){
    float d=length(gl_PointCoord-.5);
    float light=pow(max(1.-d*2.,0.),1.3);
    vec3 color=mix(vec3(.46,.72,.98),vec3(1.,.86,.61),smoothstep(.6,.98,warmth));
    color=mix(color,vec3(.9,.97,1.),light*.5);
    gl_FragColor=vec4(color,alpha*light);
   }
  `
 });
 const actor=new T.Points(geometry,material);actor.quaternion.copy(camera.quaternion);actor.renderOrder=50;actor.frustumCulled=false;actor.visible=false;
 let sampled=false;
 const prepare=()=>{
  if(sampled)return true;
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=320;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return false;
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='300 224px MiSans, sans-serif';
  ctx.fillText('见',350,157);ctx.fillText('微',610,157);
  const pixels=ctx.getImageData(0,0,960,320).data,points:number[]=[];
  for(let y=30;y<290;y+=2)for(let x=180;x<780;x+=2)if(pixels[(y*960+x)*4+3]>160)points.push(x,y);
  const length=points.length/2;if(!length)return false;
  for(let i=0;i<count;i++){
   const index=Math.floor(i*length/count)*2;
   letters.set([(points[index]-480)*.0084,(160-points[index+1])*.0084,(seeds[i]-.5)*.035],i*3);
  }
  geometry.attributes.letter.needsUpdate=true;sampled=true;return true;
 };
 return {actor,uniforms,prepare};
}
