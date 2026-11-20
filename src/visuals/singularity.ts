// Stylized, procedural light: these shaders are independently authored for the interface.
export const diskVertex=`
varying vec3 local;
void main(){local=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
export const diskFragment=`
uniform float time;
uniform float activity;
uniform float opacity;
varying vec3 local;
float hash(vec2 p){return fract(sin(dot(p,vec2(91.17,287.63)))*41819.37);}
float noise(vec2 p){vec2 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);return mix(mix(hash(a),hash(a+vec2(1.,0.)),b.x),mix(hash(a+vec2(0.,1.)),hash(a+1.),b.x),b.y);}
void main(){
 float r=length(local.xy),angle=atan(local.y,local.x);
 float turn=angle-time*(.22+activity*.12)/pow(r+.25,1.25);
 float cloud=noise(vec2(cos(turn)*r*2.5,sin(turn)*r*2.5));
 cloud+=noise(vec2(turn*5.+r*2.,r*8.-time*.08))*.4;
 float bands=pow(.5+.5*sin(r*37.+cloud*12.+sin(turn*3.+r*6.)*2.5),6.);
 float fibers=pow(.5+.5*sin(r*97.+cloud*16.+turn*3.),8.);
 float inner=smoothstep(.71,.86,r),outer=1.-smoothstep(1.2,2.6,r);
 float hot=exp(-max(r-.84,0.)*2.8);
 float hotArc=pow(.5+.5*sin(angle+.8),4.);
 float density=(.045+cloud*.3+bands*.08+fibers*.02)*inner*outer;
 vec3 cold=vec3(.05,.22,.48),warm=vec3(.9,.41,.12),white=vec3(.84,.94,1.);
 vec3 color=mix(cold,warm,(1.-smoothstep(.85,2.6,r))*.78);
 color=mix(color,white,hot*.85);
 color*=.3+hot*2.3+hotArc*.65;
 color+=white*bands*hot*hotArc*.5;
 gl_FragColor=vec4(color,density*opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const rimVertex=`
varying vec3 normalView;varying vec3 viewDirection;
void main(){vec4 p=modelViewMatrix*vec4(position,1.);normalView=normalize(normalMatrix*normal);viewDirection=normalize(-p.xyz);gl_Position=projectionMatrix*p;}
`;
export const rimFragment=`
uniform float strength;varying vec3 normalView;varying vec3 viewDirection;
void main(){float rim=pow(1.-max(dot(normalize(normalView),normalize(viewDirection)),0.),5.);vec3 color=mix(vec3(.18,.47,.68),vec3(.9,.94,1.),pow(rim,2.));gl_FragColor=vec4(color,rim*strength);}
`;
export const streamVertex=`
uniform float time;uniform float activity;attribute float seed;varying float alpha;
void main(){
 float r=length(position.xz),theta=atan(position.z,position.x)+time*(.06+activity*.08)/pow(r+.2,1.35);
 vec3 p=vec3(cos(theta)*r,position.y+sin(theta*3.+seed*9.)*.015,sin(theta)*r);
 vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;
 gl_PointSize=clamp((.5+seed*1.6)*7./max(-v.z,1.),.5,2.5);
 alpha=(.15+seed*.7)*(1.-smoothstep(1.8,3.8,r));
}
`;
export const streamFragment=`
varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.55,.86,1.,alpha*(1.-smoothstep(.05,.5,d)));}
`;
