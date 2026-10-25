/* Renderer, cena, materiais, luzes dinâmicas, paletas e céu */
import {ST} from './shared.js';
import {canvas,fail} from './dom.js';
import {L,SHOW_Z,cfg,smooth} from './config.js';
import {obstacles} from './state.js';

export let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});}
catch(e){fail('Este navegador não conseguiu iniciar o WebGL.');throw new Error('Corrida: inicialização interrompida');}

ST.appliedRes=0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,cfg.res));ST.appliedRes=cfg.res;

/* ------------------------------------------------------------------ */
/* Cena, luzes e mundo curvo                                           */
/* ------------------------------------------------------------------ */
export const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xffb383,55,178);
export const camera=new THREE.PerspectiveCamera(62,1,0.1,620);
export const hemi=new THREE.HemisphereLight(0xffffff,0x444444,0.9);scene.add(hemi);
export const sunL=new THREE.DirectionalLight(0xffffff,0.9);sunL.position.set(-30,50,25);scene.add(sunL);
export const spot=new THREE.SpotLight(0xfff1d6,0,60,0.46,0.6,1);
spot.position.set(0,11,SHOW_Z+0.5);spot.target.position.set(0,0.4,SHOW_Z);scene.add(spot,spot.target);

export const bendU={uBend:{value:new THREE.Vector2(0,0)},uDip:{value:[0,1,2,3].map(()=>new THREE.Vector4())},uToon:{value:0}};
/* estilo Desenho: a luz direta vira faixas suaves e a sombra nunca fica escura, mantendo a cor da luz */
const TOON='\nfloat tDl=dot(reflectedLight.directDiffuse,vec3(0.299,0.587,0.114));\n'+
  'float tAl=max(dot(diffuseColor.rgb,vec3(0.299,0.587,0.114))*RECIPROCAL_PI,1e-4);\n'+
  'float tL=tDl/tAl;\nfloat tQ=0.42+0.5*smoothstep(0.18,0.42,tL)+0.18*smoothstep(0.95,1.25,tL);\n'+
  'reflectedLight.directDiffuse*=mix(1.0,tQ/max(tL,1e-3),uToon);\n';
/* rebaixa a faixa da pista (|x|<7) nas passagens subterrâneas: uDip[k] = início, fim, profundidade, rampa */
const DIP='vec4 wq=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nwq=instanceMatrix*wq;\n#endif\nwq=modelMatrix*wq;\n'+
  'float dd=-wq.z,dy=0.0;\nfor(int k=0;k<4;k++){vec4 u=uDip[k];if(u.z>0.0)dy-=u.z*smoothstep(u.x,u.x+u.w,dd)*(1.0-smoothstep(u.y-u.w,u.y,dd));}\n'+
  'dy*=1.0-smoothstep(6.25,6.6,abs(wq.x));\nmvPosition=viewMatrix*vec4(wq.xyz+vec3(0.0,dy,0.0),1.0);\n';
/* noDip: peças fora da pista ou que já são modeladas na altura certa (chão, calçada, estrutura da passagem) */
export function patch(mat,noDip){
  mat.onBeforeCompile=function(s){
    s.uniforms.uBend=bendU.uBend;s.uniforms.uDip=bendU.uDip;s.uniforms.uToon=bendU.uToon;
    s.fragmentShader=s.fragmentShader
      .replace('#include <common>','#include <common>\nuniform float uToon;')
      .replace('#include <lights_fragment_end>','#include <lights_fragment_end>'+TOON);
    s.vertexShader=s.vertexShader
      .replace('#include <common>','#include <common>\nuniform vec2 uBend;\nuniform vec4 uDip[4];')
      .replace('#include <project_vertex>','#include <project_vertex>\n'+(noDip?'':DIP)+'float bz=max(0.0,-mvPosition.z);\nmvPosition.x+=uBend.x*bz*bz;\nmvPosition.y-=uBend.y*bz*bz;\ngl_Position=projectionMatrix*mvPosition;');
  };
  mat.customProgramCacheKey=()=>noDip?'bend':'bend-dip';
  return mat;
}
const mk=(o,noDip)=>patch(new THREE.MeshPhongMaterial(Object.assign({flatShading:true,specular:0x000000,shininess:0},o)),noDip);
export const M={
  asphalt:mk({color:0x3c3d4a}), ground:mk({color:0x86a458},true), foliage:mk({color:0x3f8050,vertexColors:true}), trunk:mk({color:0x5a3b2a}),
  mount:mk({color:0x7a6aa0}), rock:mk({color:0x8a8795}), line:mk({color:0xf4efe0}), red:mk({color:0xd8433a}), white:mk({color:0xf2efe6}),
  vcol:mk({vertexColors:true}), coin:mk({color:0xffc24a,emissive:0x6b4300}), deb:mk({color:0xff5a36}), smoke:mk({color:0x8a8f99}),
  post:patch(new THREE.MeshBasicMaterial({color:0xfff0c8})),
  lights:patch(new THREE.MeshBasicMaterial({vertexColors:true})),
  blob:patch(new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.32,depthWrite:false})),
  stage:mk({color:0x161026}), pedestal:mk({color:0x2a2340}), rim:new THREE.MeshBasicMaterial({color:0xff5a36}),
  beam:new THREE.MeshBasicMaterial({color:0xfff1d6,transparent:true,opacity:0.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}),
  star:new THREE.MeshBasicMaterial({color:0xffd84a})
};

/* Materiais extras: cenário, poeira, luzes */
Object.assign(M,{
  foliage2:mk({color:0x57a05a,vertexColors:true}),
  bush:mk({color:0x4a9a4e,vertexColors:true}),
  yellow:mk({color:0xf2b705,emissive:0x2e2300}),
  win:patch(new THREE.MeshBasicMaterial({vertexColors:true,color:0x6f9bc8})),
  lhead:patch(new THREE.MeshBasicMaterial({color:0xdfe6ef})),
  pool:patch(new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})),
  dust:patch(new THREE.MeshBasicMaterial({color:0xcdbb98,transparent:true,opacity:0.6,depthWrite:false})),
  cloud:new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true,fog:false}),
  halo:patch(new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})),
  rays:patch(new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})),
  beacon:patch(new THREE.MeshBasicMaterial({color:0xffa21a})),
  sig:patch(new THREE.MeshBasicMaterial({color:0xffa81a})),
  sidew:mk({color:0xa9a39a},true),
  cground:mk({color:0x8f8c86},true),
  sand:mk({color:0xdcbc84},true),
  vest:patch(new THREE.MeshBasicMaterial({vertexColors:true})),
  pool2:patch(new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})),
  beam2:new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})
});
/* Luzes dinâmicas de verdade: poucas luzes reaproveitadas que seguem os postes, a barreira
   mais próxima e o carro. Elas entram no sombreamento de tudo (pista, carro, obstáculos). */
const LAMP_MAX=4;
export const lampL=[];
for(let i=0;i<LAMP_MAX;i++){const l=new THREE.PointLight(0xffd7a0,0,38,1.6);scene.add(l);lampL.push(l);}
export const beaconL=new THREE.PointLight(0xff8a1a,0,18,1.7);scene.add(beaconL);
const headL=new THREE.SpotLight(0xfff2cf,0,72,0.46,0.5,2);
const headR=new THREE.SpotLight(0xfff2cf,0,72,0.46,0.5,2);
scene.add(headL,headL.target,headR,headR.target);
/* o mundo é curvado no vertex shader; as luzes recebem o mesmo desvio para casarem com a geometria */
function bendSet(o,x,y,z){
  const bz=Math.max(0,camera.position.z-z),u=bendU.uBend.value;
  o.position.set(x+u.x*bz*bz,y-u.y*bz*bz,z);
}
/* hasLamp(i): a faixa i tem poste; ry(d): altura da pista (passagem subterrânea) */
export function updateLights(now,night,beamK,on,hasLamp,ry){
  const live=ST.state!=='menu', lk=live?night:0, S=Math.min(LAMP_MAX,Math.max(0,Math.round(cfg.lampN)));
  const assign=[];
  if(lk>0.01&&S>0){
    const i0=Math.floor((ST.dist-34)/L), i1=Math.ceil((ST.dist+112)/L), cand=[];
    for(let i=i0;i<=i1;i++)if(hasLamp(i))cand.push(i);
    cand.sort(function(a,b){return Math.abs(a*L-ST.dist-14)-Math.abs(b*L-ST.dist-14);});
    cand.forEach(function(i){const s=(((i/3)%S)+S)%S;if(assign[s]===undefined)assign[s]=i;});
  }
  for(let j=0;j<LAMP_MAX;j++){
    const l=lampL[j], i=assign[j];
    if(j>=S||i===undefined){l.intensity=0;continue;}
    const ahead=i*L-ST.dist, fade=(1-smooth(70,108,ahead))*(1-smooth(14,34,-ahead));
    l.intensity=2.8*cfg.lampI*lk*fade;
    bendSet(l,((Math.floor(i/3)&1)?1:-1)*5.1,8.0,-i*L);
  }
  /* luz giratória da barreira mais próxima */
  let bo=null,bd=1e9;
  if(live&&S>0)for(let n=0;n<obstacles.length;n++){
    const o=obstacles[n];if(!o.mesh.userData.bc||o.hit)continue;
    const a=o.d-ST.dist;if(a>-8&&a<75&&a<bd){bd=a;bo=o;}
  }
  if(bo){
    const ph=Math.max(0,Math.cos(now*0.012+bo.d*0.7));
    beaconL.intensity=(1+3.2*ph)*(0.4+0.6*night)*cfg.lampI*(1-smooth(45,75,bd));
    bendSet(beaconL,bo.x,1.7+ry(bo.d),-bo.d);
  }else beaconL.intensity=0;
  /* faróis: dois refletores acima do capô, apontados para a pista */
  const hk=beamK*on*cfg.headI;
  [headL,headR].forEach(function(h,n){
    const sx=n?0.8:-0.8;
    h.intensity=7.5*hk;
    bendSet(h,ST.px+sx,2.6+ry(ST.dist),-ST.dist+0.4);
    bendSet(h.target,ST.px+sx*0.6,ry(ST.dist+30),-ST.dist-30);
  });
}
/* mancha de luz dos faróis no asfalto, à frente do carro */
export const headPool=(function(){
  const n=18,P=[],Cc=[];
  for(let i=0;i<n;i++){
    const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
    P.push(0,0,0,Math.cos(a0),Math.sin(a0),0,Math.cos(a1),Math.sin(a1),0);
    Cc.push(0.62,0.56,0.4,0,0,0,0,0,0);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));
  g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,M.pool2);m.scale.set(3.4,1,16);m.frustumCulled=false;m.visible=false;scene.add(m);return m;
})();

M.wrench=mk({vertexColors:true,emissive:0x2b5d72});
/* túneis: montanha (cor da paleta), revestimento interno e estrutura da passagem subterrânea */
M.hill=mk({color:0x7a6aa0,side:THREE.DoubleSide});
/* carros importados de .glb: as peças finas (asa, retrovisor) precisam das duas faces */
M.vcolD=mk({vertexColors:true,side:THREE.DoubleSide});
M.tube=mk({vertexColors:true,side:THREE.DoubleSide});
M.upw=mk({vertexColors:true,side:THREE.DoubleSide},true);
M.tlamp=patch(new THREE.MeshBasicMaterial({color:0xfff0c8}),true);

/* ---------- Caminhada dos pedestres no vertex shader ----------
   aLimb diz a parte do corpo; a fase do passo vem de aWalk (instâncias: deslocamento, ritmo) ou de uWalk (fase, amplitude). */
bendU.uWalkT={value:0};
const WALK_HEAD='attribute float aLimb;\nuniform float uWalkT;\n#ifdef USE_INSTANCING\nattribute vec2 aWalk;\n#else\nuniform vec2 uWalk;\n#endif\n'+
  'vec3 wRot(vec3 p,float py,float a){p.y-=py;float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z)+vec3(0.0,py,0.0);}\n';
const WALK_BODY=[
  '#ifdef USE_INSTANCING',
  'float wp=uWalkT*aWalk.y+aWalk.x, wa=step(0.001,aWalk.y);',
  '#else',
  'float wp=uWalk.x, wa=uWalk.y;',
  '#endif',
  'float sp=sin(wp), cp=cos(wp), lb=aLimb, isL=mod(lb,2.0);',
  'if(lb>0.5&&lb<4.5){',
  /* pernas: a coxa balança e o joelho dobra enquanto a perna volta para a frente */
  '  float hip=(isL>0.5?0.5*sp:-0.5*sp)*wa, knee=-0.95*(isL>0.5?max(0.0,cp):max(0.0,-cp))*wa;',
  '  if(lb>2.5)transformed=wRot(transformed,0.46,knee);',
  '  transformed=wRot(transformed,0.86,hip);',
  '}else if(lb>4.5&&lb<8.5){',
  /* braços: oposto à perna do mesmo lado, cotovelo levemente dobrado */
  '  float sh=(isL>0.5?-0.42*sp:0.42*sp)*wa, el=(0.22+0.28*(isL>0.5?max(0.0,-sp):max(0.0,sp)))*wa;',
  '  if(lb>6.5)transformed=wRot(transformed,1.2,el);',
  '  transformed=wRot(transformed,1.5,sh);',
  '}',
  /* o corpo sobe quando a perna de apoio passa por baixo e balança um pouco de lado */
  'transformed.y+=wa*0.045*(abs(cp)-0.6);',
  'transformed.x+=wa*0.025*sp;'
].join('\n');
function walkPatch(mat,u){
  const prev=mat.onBeforeCompile, pk=mat.customProgramCacheKey;
  mat.onBeforeCompile=function(s){
    prev(s);
    s.uniforms.uWalkT=bendU.uWalkT;if(u)s.uniforms.uWalk=u.uWalk;
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\n'+WALK_HEAD).replace('#include <begin_vertex>','#include <begin_vertex>\n'+WALK_BODY);
  };
  mat.customProgramCacheKey=()=>pk()+'-walk';
  return mat;
}
/* pedestres da calçada (instâncias) */
M.pedI=walkPatch(mk({vertexColors:true}));
/* pedestre solto na pista: cada um tem seus materiais, com a própria fase do passo em userData.walk */
export const vestMats=[];
export function pedMats(){
  const u={uWalk:{value:new THREE.Vector2(0,0)}};
  const body=walkPatch(mk({vertexColors:true}),u), vest=walkPatch(patch(new THREE.MeshBasicMaterial({vertexColors:true})),u);
  vestMats.push(vest);body.userData.walk=u.uWalk.value;
  return [body,vest];
}

/* Cenários da pista */
const CK=['top','hor','ground','tree','mount','hemiS','hemiG','dir','sun','road'];
export const PAL=[
  {name:'Amanhecer',top:0x4a3a8c,hor:0xffb383,ground:0x86a458,tree:0x3f8050,mount:0x7a6aa0,hemiS:0xffd9b0,hemiG:0x5c4a6a,dir:0xffe0b0,dirI:0.8,hemiI:0.85,star:0,sun:0xfff1c0,road:0x3c3d4a},
  {name:'Meio-dia',top:0x2f86d6,hor:0xd3ecff,ground:0x74bb55,tree:0x2e8c52,mount:0x8aa0bd,hemiS:0xdff1ff,hemiG:0x6b7a58,dir:0xfff8e8,dirI:0.95,hemiI:0.9,star:0,sun:0xffffe8,road:0x42444f},
  {name:'Entardecer',top:0x2a2159,hor:0xff6a55,ground:0xc58450,tree:0x8d6a3c,mount:0x8a4660,hemiS:0xffb08a,hemiG:0x5a3446,dir:0xffc38a,dirI:0.8,hemiI:0.8,star:0.15,sun:0xffd37a,road:0x373640},
  {name:'Noite',top:0x050818,hor:0x29306e,ground:0x22404f,tree:0x1d5e55,mount:0x252c63,hemiS:0x6f7fd0,hemiG:0x232a52,dir:0x90a0ff,dirI:0.3,hemiI:0.55,star:1,sun:0xe6ecff,road:0x23252f}
];
PAL.forEach(p=>CK.forEach(k=>{p[k]=new THREE.Color(p[k]);}));
export const studio={top:new THREE.Color(0x0c0818),bot:new THREE.Color(0x1d1433)};

/* Céu */
export const skyU={top:{value:new THREE.Color()},bot:{value:new THREE.Color()}};
export const skyGroup=new THREE.Group();scene.add(skyGroup);
const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(450,16,12),new THREE.ShaderMaterial({
  uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 top;uniform vec3 bot;varying vec3 vP;void main(){float h=normalize(vP).y;float k=smoothstep(-0.02,0.55,h);gl_FragColor=vec4(mix(bot,top,k),1.0);}'
}));
skyMesh.renderOrder=-10;skyMesh.frustumCulled=false;skyGroup.add(skyMesh);
export const sunMat=new THREE.MeshBasicMaterial({color:0xfff1c0,fog:false,depthWrite:false});
export const sunMesh=new THREE.Mesh(new THREE.CircleGeometry(46,14),sunMat);
sunMesh.position.set(0,34,-420);sunMesh.renderOrder=-9;sunMesh.frustumCulled=false;skyGroup.add(sunMesh);
const starPos=[];for(let i=0;i<240;i++){const a=Math.random()*Math.PI*2,e=0.08+Math.random()*1.3,r=390;starPos.push(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r);}
const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
export const starMat=new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false});
export const stars=new THREE.Points(starGeo,starMat);stars.renderOrder=-9;stars.frustumCulled=false;skyGroup.add(stars);
