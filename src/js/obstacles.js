/* Modelos de obstáculos, animais, cidade e pórticos */
import {fmt} from './config.js';
import {M,patch,pedMats,scene} from './scene.js';
import {FR,H,PB,PCo,PCy,UB,geo,geoL,tm,wheelS} from './geometry.js';
import {sedanGeo,truckGeo,vanGeo} from './vehicles.js';

/* ---------- Obstáculos ---------- */
function conesGeo(){const p=[];[[-0.55,0.35],[0.55,0.35],[0,-0.55]].forEach(function(c){p.push(PB(0.85,0.06,0.85,c[0],0.03,c[1],0x2b2b36),PCo(0.4,0.95,7,c[0],0.53,c[1],0xff7a1a),PCy(0.2,0.27,0.18,7,c[0],0.5,c[1],0xf6f2e8));});return geo(p);}
function barrelsGeo(){const p=[];[[-0.55,0.45,0xd8382b],[0.55,0.1,0xe0a41c],[0,-0.55,0xd8382b]].forEach(function(b){p.push(PCy(0.5,0.5,1.0,8,b[0],0.5,b[1],b[2]),PCy(0.52,0.52,0.12,8,b[0],0.72,b[1],0xf2efe6),PCy(0.52,0.52,0.12,8,b[0],0.3,b[1],0xf2efe6));});return geo(p);}
function barrierGeo(){return geo([PB(2.7,0.5,0.9,0,0.25,0,0xb9b6ae),PB(2.1,0.45,0.6,0,0.72,0,0xb9b6ae),PB(0.55,0.34,0.92,-0.9,0.27,0,0xff7a1a),PB(0.55,0.34,0.92,0.9,0.27,0,0xff7a1a),PB(0.55,0.34,0.92,0,0.27,0,0xf2efe6),PB(0.3,0.22,0.3,0,1.05,0,0xffc24a)]);}
/* pedestres: quatro visuais (pele, cabelo, calça); a = ângulo do passo (pernas e braços balançam opostos) */
const LOOKS=[
  {skin:0xf0c8a0,hair:0x3a2a22,pants:0x2b3350,shoe:0x1d1d22},
  {skin:0xc68a5e,hair:0x1b1410,pants:0x5a4632,shoe:0xf2efe6,long:true},
  {skin:0x8d5a3b,hair:0x15100c,pants:0x2f4f3a,shoe:0x3a2a22},
  {skin:0xf3d2b5,hair:0xc9a050,pants:0x3a3d4a,shoe:0xd8433a,long:true},
  /* executivos do centro: terno, camisa branca, gravata e pasta */
  {skin:0xe8b892,hair:0x2a1d16,pants:0x262a36,shoe:0x15151a,suit:0x262a36,tie:0xb0202a},
  {skin:0x9a6644,hair:0x121010,pants:0x3a3d44,shoe:0x15151a,suit:0x3a3d44,tie:0x2f5fb0,long:true}
];
/* modelado em pé; o shader de caminhada gira cada parte (limb) em torno da sua junta:
   1/2 coxa esq./dir. (quadril y=0.86), 3/4 canela (joelho y=0.46), 5/6 braço (ombro y=1.5), 7/8 antebraço (cotovelo y=1.2) */
const Lp=(p,limb)=>{p.limb=limb;return p;};
export function pedGeo(shirt,plain,a,n){
  const lk=LOOKS[(n||0)%LOOKS.length];
  if(lk.suit)shirt=lk.suit;
  const B=[PB(0.36,0.2,0.24,0,0.9,0,lk.pants),FR(0.38,0.5,0.24,0.27,0.62,0,0.94,0,shirt),
    PB(0.12,0.1,0.12,0,1.6,0,lk.skin),{g:new THREE.IcosahedronGeometry(0.165,1),m:tm(0,1.79,0,1,1.12,1),c:lk.skin},
    {g:new THREE.IcosahedronGeometry(0.175,1),m:tm(0,1.86,0.025,1.04,0.78,1.04),c:lk.hair},
    PB(0.045,0.045,0.02,-0.062,1.8,-0.158,0x1b1b1b),PB(0.045,0.045,0.02,0.062,1.8,-0.158,0x1b1b1b)];
  if(lk.long)B.push(PB(0.32,0.34,0.1,0,1.7,0.13,lk.hair));
  if(lk.suit)B.push(PB(0.13,0.24,0.02,0,1.4,-0.137,0xf4f4f0),PB(0.05,0.22,0.02,0,1.37,-0.148,lk.tie));
  [-1,1].forEach(function(s){
    const L0=s<0?0:1;
    /* coxa, canela e sapato */
    B.push(Lp(PB(0.17,0.42,0.18,s*0.105,0.66,0,lk.pants),1+L0),Lp(PB(0.15,0.42,0.16,s*0.105,0.26,0,lk.pants),3+L0),
      Lp(PB(0.17,0.1,0.3,s*0.105,0.05,-0.06,lk.shoe),3+L0));
    /* braço, antebraço e mão */
    B.push(Lp(PB(0.13,0.32,0.14,s*0.3,1.35,0,shirt),5+L0),Lp(PB(0.11,0.3,0.12,s*0.3,1.05,0,lk.suit?shirt:lk.skin),7+L0),
      Lp({g:new THREE.IcosahedronGeometry(0.07,0),m:tm(s*0.3,0.86,0),c:lk.skin},7+L0));
    if(lk.suit&&s>0)B.push(Lp(PB(0.08,0.26,0.36,0.34,0.68,0,0x3a2a1e),8),Lp(PB(0.03,0.05,0.12,0.34,0.83,0,0x1b1b1b),8));   /* pasta */
  });
  /* colete refletivo: só aparece à noite (material de luz) */
  const V=[PB(0.52,0.46,0.3,0,1.24,0,0xcfff2a),PB(0.54,0.06,0.32,0,1.12,0,0xf4f6f8),PB(0.54,0.06,0.32,0,1.32,0,0xf4f6f8)];
  return plain?geo(B):geoL(B,V);
}
export const PEDC=[0xe94f4f,0x4fa3e9,0xe9c84f,0x8a5be9,0x262a36,0x3a3d44];
/* carreta-rampa: reboque baixo com rampa de subida na traseira (z positivo, virado para o jogador) */
function rampGeo(c){
  const B=[PB(2.2,0.3,5.6,0,0.62,-1.7,0x1e2028),PB(2.5,0.22,3.4,0,0.94,-1.3,c),
    PB(0.1,0.34,3.4,-1.2,1.2,-1.3,0x2a2d3a),PB(0.1,0.34,3.4,1.2,1.2,-1.3,0x2a2d3a),
    PB(0.3,0.2,2.0,0,0.7,-4.0,0x15151a),PB(0.16,0.5,0.16,0,0.45,-3.2,0x6b7078),
    FR(2.4,2.4,3.0,0.1,1.05,0,0,1.9,c,-1.45),
    PB(2.42,0.05,0.5,0,0.06,3.15,0xf4efe0)].concat(wheelS(-1.15,-1.9,0.45,0.4),wheelS(1.15,-1.9,0.45,0.4),wheelS(-1.15,-0.9,0.45,0.4),wheelS(1.15,-0.9,0.45,0.4));
  for(let k=0;k<5;k++)B.push(PB(2.44,0.04,0.28,0,0.3+k*0.17,1.9+1.35-k*0.62-0.3,k%2?0x16161b:0xf4efe0));
  return geoL(B,[PB(0.4,0.2,0.05,-0.9,0.3,3.42,0xff2d2d),PB(0.4,0.2,0.05,0.9,0.3,3.42,0xff2d2d)],[H(-0.9,0.3,3.46,0.6,0xff2a1a),H(0.9,0.3,3.46,0.6,0xff2a1a)]);
}
export const fuelGeo=geo([PB(0.62,0.82,0.3,0,0,0,0xd8263a),PB(0.5,0.08,0.32,0,0.2,0,0xa01828),PB(0.5,0.08,0.32,0,-0.2,0,0xa01828),
  PB(0.32,0.1,0.12,-0.08,0.48,0,0x2a2c34),PB(0.06,0.14,0.12,-0.22,0.44,0,0x2a2c34),PB(0.06,0.14,0.12,0.06,0.44,0,0x2a2c34),
  PCy(0.07,0.07,0.14,8,0.22,0.48,0,0xffc24a),PB(0.36,0.34,0.02,0,0,0.16,0xf4f1ea)]);
export const wrenchGeo=(function(){
  const g=geo([PB(0.2,1.15,0.14,0,-0.05,0,0xdfe6ef),PB(0.25,0.55,0.17,0,-0.38,0,0x2a6fd6),PB(0.8,0.22,0.14,0,0.62,0,0xdfe6ef),
    PB(0.22,0.44,0.14,-0.29,0.92,0,0xdfe6ef),PB(0.22,0.44,0.14,0.29,0.92,0,0xdfe6ef),PB(0.5,0.26,0.14,0,-0.72,0,0xdfe6ef)]);
  g.rotateZ(0.7);return g;
})();
/* animais: viram de frente para -z (nariz), como os carros. O parâmetro a gira as pernas (passo); a=0 é parado. */
function legB(x,hy,hz,L,w,a,c){return {g:UB,m:tm(x,hy-L/2*Math.cos(a),hz-L/2*Math.sin(a),w,L,w,a,0,0),c:c};}
export function deerGeo(a){
  a=a||0;
  const B=[PB(0.5,0.55,1.25,0,1.0,0,0xa26a3a),PB(0.52,0.18,0.7,0,0.8,0.2,0xe8d7bd),PB(0.24,0.7,0.26,0,1.5,-0.62,0xa26a3a),
    PB(0.26,0.26,0.5,0,1.82,-0.82,0xa26a3a),PB(0.14,0.12,0.14,0,1.8,-1.12,0x2b1d14),
    PB(0.06,0.55,0.06,-0.1,2.2,-0.78,0x3a2a22),PB(0.06,0.55,0.06,0.1,2.2,-0.78,0x3a2a22),
    PB(0.05,0.05,0.34,-0.14,2.42,-0.9,0x3a2a22),PB(0.05,0.05,0.34,0.14,2.42,-0.9,0x3a2a22),
    PB(0.12,0.2,0.12,0,1.2,0.68,0xf2efe6)];
  [[-0.17,-0.45,1],[0.17,-0.45,-1],[-0.17,0.5,-1],[0.17,0.5,1]].forEach(function(p){B.push(legB(p[0],0.8,p[1],0.8,0.11,a*p[2],0x7a4f2a));});
  return geo(B);
}
export function foxGeo(a){
  a=a||0;
  const B=[PB(0.3,0.3,0.75,0,0.5,0,0xe0702a),PB(0.24,0.24,0.3,0,0.62,-0.5,0xe0702a),PB(0.1,0.1,0.12,0,0.58,-0.68,0x1b1b1b),
    PB(0.07,0.14,0.07,-0.08,0.8,-0.45,0x1b1b1b),PB(0.07,0.14,0.07,0.08,0.8,-0.45,0x1b1b1b),
    PB(0.2,0.2,0.6,0,0.52,0.62,0xe0702a),PB(0.2,0.2,0.18,0,0.52,0.98,0xf6f2e8)];
  [[-0.1,-0.28,1],[0.1,-0.28,-1],[-0.1,0.28,-1],[0.1,0.28,1]].forEach(function(p){B.push(legB(p[0],0.34,p[1],0.34,0.07,a*p[2],0x2a2018));});
  return geo(B);
}
export function rabbitGeo(a){
  a=a||0;
  const B=[PB(0.26,0.26,0.4,0,0.3,0,0xb9aa94),PB(0.18,0.18,0.2,0,0.42,-0.26,0xb9aa94),
    PB(0.05,0.3,0.05,-0.05,0.68,-0.24,0xb9aa94),PB(0.05,0.3,0.05,0.05,0.68,-0.24,0xb9aa94),
    PB(0.1,0.1,0.1,0,0.34,0.24,0xffffff)];
  [[-0.1,1],[0.1,1]].forEach(function(p){B.push(legB(p[0],0.2,0.14,0.22,0.08,a*p[1],0x8d8068));});
  [[-0.08,-1],[0.08,-1]].forEach(function(p){B.push(legB(p[0],0.2,-0.12,0.18,0.06,a*p[1],0x8d8068));});
  return geo(B);
}
/* junta várias malhas (corpo, luzes, brilho) já transformadas numa só */
function mergeL(items){
  const G=[[],[],[]],Cc=[[],[],[]];
  items.forEach(function(it){
    const g=it.g.clone();g.applyMatrix4(it.m);
    const P=g.attributes.position.array,C=g.attributes.color.array;
    const grs=g.groups.length?g.groups:[{start:0,count:P.length/3,materialIndex:0}];
    grs.forEach(function(gr){for(let k=gr.start*3;k<(gr.start+gr.count)*3;k++){G[gr.materialIndex].push(P[k]);Cc[gr.materialIndex].push(C[k]);}});
  });
  const P=[],C=[],groups=[];
  for(let m=0;m<3;m++){if(!G[m].length)continue;groups.push([P.length/3,G[m].length/3,m]);for(let k=0;k<G[m].length;k++){P.push(G[m][k]);C.push(Cc[m][k]);}}
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  out.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  out.computeVertexNormals();
  groups.forEach(function(g){out.addGroup(g[0],g[1],g[2]);});
  return out;
}
/* acidente: dois carros amassados atravessados na via, destroços e triângulo de aviso */
function crashGeo(c1,c2){
  const extra=geo([PB(3.4,0.02,4.6,0,0.015,0.6,0x1a1a20),PB(0.6,0.08,0.35,-0.9,0.06,2.6,0x9aa3b2),PB(0.4,0.08,0.5,1.0,0.06,3.0,0x2a2d3a),
    PB(0.3,0.06,0.3,0.1,0.05,1.9,0xdfe6ef),PB(0.5,0.1,0.25,-1.3,0.07,0.8,0x15151a),
    PCo(0.42,0.75,3,0.2,0.375,4.3,0xff3b2a),PCo(0.22,0.4,3,0.2,0.3,4.3,0xf2efe6)]);
  return mergeL([{g:sedanGeo(c1),m:tm(-0.3,0,-0.8,1,1,1,0,0.4,0)},{g:sedanGeo(c2),m:tm(0.45,0,1.3,1,1,1,0,-0.55,0.07)},{g:extra,m:new THREE.Matrix4()}]);
}
/* cidade: lojas, barracas e carrinhos de venda */
export function shopGeo(col,aA,aB,sc){
  const w=9.6,d=6,h=4.4;
  const B=[PB(w,h,d,0,h/2,0,col),PB(w+0.3,0.3,d+0.3,0,h+0.15,0,0x6c7380),PB(1.4,2.4,0.1,w*0.28,1.2,d/2+0.02,0x3a2a22),PB(w*0.62,0.8,0.12,0,3.75,d/2+0.06,sc)];
  for(let k=0;k<6;k++)B.push(PB(w/6-0.02,0.12,1.7,-w/2+w/12+k*w/6,3.05,d/2+0.8,k%2?aB:aA));
  const Wn=[PB(w*0.3,1.5,0.1,-w*0.25,1.5,d/2+0.04,0xf0f0f0),PB(1.3,1.5,0.1,w*0.04,1.5,d/2+0.04,0xf0f0f0),PB(0.9,1.5,0.06,w*0.28,1.4,d/2+0.08,0xf0f0f0)];
  return geoL(B,Wn);
}
export function stallGeo(c1,c2,fr){
  const B=[PB(2.4,0.9,1.1,0,0.45,0,0x8a6a45),PB(2.5,0.08,1.2,0,0.94,0,0xb08a5a)];
  [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){B.push(PB(0.08,2.3,0.08,sx*1.15,1.15,sz*0.55,0x5b616d));});});
  for(let k=0;k<4;k++)B.push(PB(0.62,0.08,1.5,-0.93+k*0.62,2.34,0,k%2?c2:c1));
  for(let k=0;k<5;k++)B.push(PB(0.34,0.22,0.34,-0.95+k*0.48,1.1,k%2?0.15:-0.15,fr[k%fr.length]));
  return geo(B);
}
export function cartGeo(c){
  const B=[PB(1.7,0.75,0.95,0,0.95,0,0xd8d2c4),PB(1.76,0.1,1.0,0,1.36,0,0x8d94a0),PB(0.5,0.3,0.4,-0.45,1.56,0,0xe9b52a),PB(0.4,0.26,0.4,0.2,1.54,0.1,0xd8433a),
    PB(0.06,1.5,0.06,0.6,2.1,0,0x5b616d),PCo(1.5,0.6,8,0.6,2.85,0,c),PB(0.08,0.08,0.9,-0.95,1.0,0,0x5b616d)];
  [-0.7,0.7].forEach(function(x){B.push(PCy(0.32,0.32,0.1,10,x,0.32,0.1,0x15151a,0,0,Math.PI/2));});
  return geo(B);
}
function patchGeo(){
  const p=[PB(3.0,0.05,11.6,0,0.025,0,0x5b4b3d)];
  [[-0.9,-3.5,2.4,0.08],[0.7,-1.2,3.0,-0.06],[-0.3,2.6,2.6,0.05],[1.0,4.2,1.6,-0.1]].forEach(function(c){p.push({g:UB,m:tm(c[0],0.052,c[1],0.07,0.02,c[2],0,c[3],0),c:0x2a2420});});
  [[-0.7,-2.0,0.55],[0.6,1.3,0.7],[-0.2,4.4,0.45]].forEach(function(h){p.push(PCy(h[2],h[2]*1.1,0.07,9,h[0],0.05,h[1],0x1d1916));});
  [[0.3,-4.4],[-1.0,0.2],[0.9,3.1],[-0.5,5.0]].forEach(function(g){p.push(PB(0.3,0.06,0.25,g[0],0.06,g[1],0x8a7a69));});
  return geo(p);
}
/* ---------- Deserto ---------- */
/* duna de areia na pista: sobe de z=+3.6 até o topo (z≈+0.3, 1,1 m) e desce atrás — faz o carro saltar como a rampa */
function duneGeo(tone){
  const prof=[[3.7,0],[2.6,0.36],[1.5,0.74],[0.3,1.1],[-0.9,0.92],[-2.1,0.45],[-3.2,0]], P=[],C=[];
  const sec=(z,y)=>{const hw=1.45-y*0.25;return [[-hw-0.25,0,z],[-hw*0.75,y*0.85,z],[0,y,z],[hw*0.75,y*0.85,z],[hw+0.25,0,z]];};
  const col=[new THREE.Color(tone),new THREE.Color(tone).multiplyScalar(0.86)];
  for(let k=0;k<prof.length-1;k++){
    const A=sec(prof[k][0],prof[k][1]),B=sec(prof[k+1][0],prof[k+1][1]);
    for(let g=0;g<4;g++){
      const c=col[(g===0||g===3)?1:0];
      [[A[g],A[g+1],B[g+1]],[A[g],B[g+1],B[g]]].forEach(function(t){t.forEach(function(v){P.push(v[0],v[1],v[2]);C.push(c.r,c.g,c.b);});});
    }
  }
  /* marcas de vento na areia */
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.computeVertexNormals();
  const rip=geo([PB(2.2,0.02,0.08,0,0.62,1.8,0xc9a466),PB(2.0,0.02,0.08,0,0.95,0.9,0xc9a466),PB(2.1,0.02,0.08,0,0.78,-1.3,0xc9a466)]);
  const out=geoMerge([g,rip]);return out;
}
function geoMerge(list){
  const P=[],C=[];list.forEach(function(g){const a=g.index?g.toNonIndexed():g;P.push(...a.attributes.position.array);C.push(...a.attributes.color.array);});
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));o.setAttribute('color',new THREE.Float32BufferAttribute(C,3));o.computeVertexNormals();return o;
}
/* buraco no asfalto: borda quebrada e fundo escuro */
function holeGeo(seed){
  const parts=[],n=11,rnd=k=>{const x=Math.sin(seed*91.7+k*12.9)*43758.5;return x-Math.floor(x);};
  const pit=[];for(let k=0;k<n;k++){const a=k/n*Math.PI*2,r=0.75+rnd(k)*0.35;pit.push([Math.cos(a)*r*1.1,Math.sin(a)*r*0.9]);}
  const P=[],C=[],dark=new THREE.Color(0x0d0d10),rim=new THREE.Color(0x55555c);
  for(let k=0;k<n;k++){
    const a=pit[k],b=pit[(k+1)%n];
    P.push(0,0.02,0, b[0],0.02,b[1], a[0],0.02,a[1]);for(let v=0;v<3;v++)C.push(dark.r,dark.g,dark.b);
    P.push(a[0],0.02,a[1], b[0],0.02,b[1], b[0]*1.25,0.03,b[1]*1.25, a[0],0.02,a[1], b[0]*1.25,0.03,b[1]*1.25, a[0]*1.25,0.03,a[1]*1.25);for(let v=0;v<6;v++)C.push(rim.r,rim.g,rim.b);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.computeVertexNormals();
  const bits=[];for(let k=0;k<6;k++){const a=rnd(k+20)*6.28,r=1.3+rnd(k+30)*0.5;bits.push({g:UB,m:tm(Math.cos(a)*r,0.05,Math.sin(a)*r,0.18+rnd(k)*0.2,0.07,0.14+rnd(k+5)*0.2,0,a,0),c:0x3c3d48});}
  return geoMerge([g,geo(bits)]);
}
/* feneco (raposa do deserto): cor de areia e orelhas enormes */
export function fennecGeo(a){
  a=a||0;
  const B=[PB(0.26,0.24,0.6,0,0.42,0,0xe2c08a),PB(0.22,0.22,0.26,0,0.54,-0.4,0xe2c08a),PB(0.08,0.08,0.1,0,0.5,-0.56,0x2a1d14),
    PB(0.06,0.26,0.14,-0.09,0.78,-0.38,0xe2c08a),PB(0.06,0.26,0.14,0.09,0.78,-0.38,0xe2c08a),PB(0.03,0.2,0.09,-0.1,0.78,-0.39,0xf4c8b0),PB(0.03,0.2,0.09,0.1,0.78,-0.39,0xf4c8b0),
    PB(0.14,0.14,0.42,0,0.46,0.48,0xe2c08a),PB(0.12,0.12,0.12,0,0.46,0.74,0x2a1d14)];
  [[-0.08,-0.22,1],[0.08,-0.22,-1],[-0.08,0.22,-1],[0.08,0.22,1]].forEach(function(p){B.push(legB(p[0],0.3,p[1],0.3,0.06,a*p[2],0xc9a46c));});
  return geo(B);
}
/* lagarto: corpo baixo e comprido, rabo fino, pernas abertas */
export function lizardGeo(a){
  a=a||0;
  const B=[PB(0.24,0.1,0.55,0,0.12,0,0x7c8a4a),PB(0.18,0.08,0.2,0,0.12,-0.36,0x7c8a4a),PB(0.04,0.04,0.04,-0.07,0.15,-0.42,0x111111),PB(0.04,0.04,0.04,0.07,0.15,-0.42,0x111111),
    PB(0.12,0.07,0.36,0,0.1,0.44,0x6c7a40),PB(0.07,0.05,0.34,0,0.08,0.78,0x6c7a40),PB(0.18,0.02,0.4,0,0.18,0,0xa0a060)];
  [[-1,-0.15,1],[1,-0.15,-1],[-1,0.18,-1],[1,0.18,1]].forEach(function(p){B.push({g:UB,m:tm(p[0]*0.18,0.06,p[1]+a*p[2]*0.12,0.18,0.05,0.06,0,p[0]*a*p[2]*0.5,0),c:0x6c7a40});});
  return geo(B);
}
/* tapete de espinhos jogado pela polícia */
function spikeGeo(){
  const B=[PB(2.9,0.05,0.34,0,0.03,0,0x22232a),PB(0.22,0.14,0.4,-1.5,0.07,0,0xffc24a),PB(0.22,0.14,0.4,1.5,0.07,0,0xffc24a)];
  for(let k=0;k<12;k++){const x=-1.32+k*0.24;B.push(PCo(0.06,0.24,4,x,0.17,-0.08,0xc9ced6),PCo(0.06,0.24,4,x+0.12,0.17,0.08,0xc9ced6));}
  return geo(B);
}

export const OB={
  patch:{kind:'deco',hw:0,hz:0,hh:0,geos:[patchGeo()]},
  cones:{kind:'fatal',hw:1.0,hz:0.9,hh:0.95,geos:[conesGeo()]},
  barrels:{kind:'fatal',hw:1.1,hz:1.0,hh:1.0,geos:[barrelsGeo()]},
  barrier:{kind:'fatal',hw:1.4,hz:0.55,hh:1.3,geos:[barrierGeo()]},
  sedan:{kind:'veh',hw:0.95,hz:2.25,hh:1.45,sg:{x:0.8,y:0.72,zf:-2.27,zr:2.27},geos:[sedanGeo(0x3a7bd5),sedanGeo(0xd8433a),sedanGeo(0x9aa3b2),sedanGeo(0x2a9d6f),sedanGeo(0xf2efe6),sedanGeo(0x26282f),sedanGeo(0x8a1f2a),sedanGeo(0xc9b38a)]},
  van:{kind:'veh',hw:1.0,hz:2.25,hh:2.0,sg:{x:0.88,y:1.15,zf:-2.27,zr:2.27},geos:[vanGeo(0x2f6fd6,0xf2efe6),vanGeo(0xd8433a,0xf2efe6),vanGeo(0x3e9d6a,0xf2efe6),vanGeo(0xe9b52a,0xf2efe6)]},
  truck:{kind:'veh',hw:1.3,hz:3.5,hh:3.0,sg:{x:1.12,y:1.2,zf:-3.52,zr:3.52},geos:[truckGeo(0xe9e5da,0x2f6fd6,0xff7a1a),truckGeo(0xff7a1a,0x3a3d4a,0xf2efe6),truckGeo(0x2ec4b6,0xe9e5da,0x2a2d3a)]},
  crash:{kind:'fatal',hw:2.0,hz:3.4,hh:1.6,geos:[crashGeo(0xd8433a,0x3a7bd5),crashGeo(0x2a9d6f,0xe9b52a)]},
  deer:{kind:'ped',hw:0.5,hz:0.8,hh:2.0,geos:[deerGeo(0)],walkG:[deerGeo(0.55),deerGeo(-0.55)]},
  fox:{kind:'ped',hw:0.4,hz:0.6,hh:1.0,sc:1.8,geos:[foxGeo(0)],walkG:[foxGeo(0.6),foxGeo(-0.6)]},
  rabbit:{kind:'ped',hw:0.35,hz:0.45,hh:0.9,sc:2.2,geos:[rabbitGeo(0)],walkG:[rabbitGeo(0.7),rabbitGeo(-0.7)]},
  ramp:{kind:'ramp',hw:1.2,hz:4.6,hh:0,geos:[rampGeo(0xf2b705),rampGeo(0xff7a1a),rampGeo(0x2ec4b6)]},
  /* deserto: a duna faz o papel da rampa, o buraco o dos obstáculos fixos */
  dune:{kind:'ramp',hw:1.2,hz:4.6,hh:0,geos:[duneGeo(0xe2c48a),duneGeo(0xd8b47a)]},
  hole:{kind:'hole',hw:0.95,hz:0.95,hh:0.7,geos:[holeGeo(1),holeGeo(2),holeGeo(3)]},
  fennec:{kind:'ped',hw:0.35,hz:0.5,hh:0.9,sc:1.8,geos:[fennecGeo(0)],walkG:[fennecGeo(0.6),fennecGeo(-0.6)]},
  lizard:{kind:'ped',hw:0.4,hz:0.6,hh:0.6,sc:2.4,geos:[lizardGeo(0)],walkG:[lizardGeo(0.8),lizardGeo(-0.8)]},
  spike:{kind:'spike',hw:1.45,hz:0.3,hh:0.6,geos:[spikeGeo()]},
  ped:{kind:'ped',hw:0.45,hz:0.55,hh:2.2,sc:1.2,matsFn:pedMats,geos:PEDC.map((c,n)=>pedGeo(c,false,0,n))}
};

/* Pórtico a cada 500 m */
const gantryGeo=geo([
  PB(0.6,8,0.6,-7.1,4,0,0x2a2d3a),PB(0.6,8,0.6,7.1,4,0,0x2a2d3a),
  PB(14.8,2.0,0.7,0,9,0,0x2a2d3a),PB(14.8,0.25,0.74,0,10.1,0,0xff5a36),PB(14.8,0.25,0.74,0,7.9,0,0xff5a36)
]);
export const gantries=[];
for(let i=0;i<3;i++){
  const grp=new THREE.Group();
  const cv=document.createElement('canvas');cv.width=512;cv.height=96;
  const tx=new THREE.CanvasTexture(cv);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9.6,1.8),patch(new THREE.MeshBasicMaterial({map:tx})));
  sign.position.set(0,9,0.42);
  grp.add(new THREE.Mesh(gantryGeo,M.vcol),sign);
  grp.visible=false;scene.add(grp);
  gantries.push({grp:grp,cv:cv,tx:tx,d:0,on:false});
}
export function drawSign(gt,d){
  const c=gt.cv.getContext('2d');
  c.fillStyle='#120d1f';c.fillRect(0,0,512,96);
  c.fillStyle='#ffc24a';c.fillRect(0,0,512,6);c.fillRect(0,90,512,6);
  c.fillStyle='#fff4e2';c.font='italic 700 58px "Chakra Petch","Trebuchet MS",sans-serif';
  c.textAlign='center';c.textBaseline='middle';
  c.fillText(fmt(d)+' m',256,52);
  gt.tx.needsUpdate=true;
}
