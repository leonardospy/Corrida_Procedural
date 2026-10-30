/* Gerador procedural de obstáculos, moedas e cruzamentos */
import {ST} from './shared.js';
import {AHEAD,L,LANES,MAXC,cfg,clamp,diff,lerp,speedAt} from './config.js';
import {M,scene} from './scene.js';
import {makeBeacon} from './geometry.js';
import {OB} from './obstacles.js';
import {cityCore,cityK,desertAt,isX} from './track.js';
import {bossClear} from './boss.js';
import {GJ,coinList,fuelList,obstacles,pools,wrenchList} from './state.js';
import {busyAt,underOf} from './tunnels.js';

/* ------------------------------------------------------------------ */
/* Gerador procedural                                                  */
/* ------------------------------------------------------------------ */
export const gen={z:90,safe:1,chic:0,pedZ:260,rampZ:340,wrZ:430,fuelZ:300,force:-1,end:0,xi:0,anZ:260,hist:[],lastD:[-1e9,-1e9,-1e9],wz:null,wzNext:560,wzQ:[],zebra:new Set()};
export function resetGen(){gen.z=90;gen.safe=1;gen.chic=0;gen.pedZ=260;gen.rampZ=340;gen.wrZ=430;gen.fuelZ=300;gen.force=-1;gen.end=0;gen.xi=0;gen.anZ=260;gen.hist=[];gen.lastD=[-1e9,-1e9,-1e9];gen.wz=null;gen.wzNext=520+Math.random()*280;gen.wzQ=[];gen.zebra=new Set();}
/* ninguém atravessa ninguém: carros seguem o da frente e quem cruza a pista espera a vez */
const solid=p=>!p.hit&&p.kind!=='deco'&&p.mesh.visible;
/* até onde um carro da via pode avançar sem encostar no que está à frente dele */
export function leaderLimit(o){
  let lim=Infinity;
  for(let n=0;n<obstacles.length;n++){
    const p=obstacles[n];
    if(p===o||!solid(p)||p.d<=o.d||Math.abs(p.x-o.x)>=p.hw+o.hw+0.25)continue;
    lim=Math.min(lim,p.d-p.hz-o.hz-2);
  }
  return lim;
}
/* quem anda de lado (pedestre, bicho, carro do cruzamento) para se o próximo passo encostar em algo à frente */
export function sideBlocked(o,nx){
  for(let n=0;n<obstacles.length;n++){
    const p=obstacles[n];
    if(p===o||!solid(p)||(p.x-o.x)*o.dir<=0)continue;
    if(Math.abs(p.d-o.d)<p.hz+o.hz+0.6&&Math.abs(p.x-nx)<p.hw+o.hw+0.3)return true;
  }
  return false;
}
/* carro da rua transversal: espera na borda da pista se não der tempo de atravessar antes do jogador
   chegar (ou se houver carro da via passando); depois de entrar, nunca para no meio */
export function crossWait(o,nx){
  const edge=7.4+o.hw, inside=Math.abs(o.x)<edge, willEnter=!inside&&Math.abs(nx)<edge;
  if(inside)return false;
  if(sideBlocked(o,nx))return true;
  if(!willEnter)return false;
  const tr=(o.d-ST.dist)/Math.max(ST.speed,8), clearT=2*edge/o.vx+0.3;
  if(tr>-0.4&&tr<clearT+0.4)return true;
  for(let n=0;n<obstacles.length;n++){
    const p=obstacles[n];
    if(p.mv&&!p.hit&&Math.abs(p.d-o.d)<p.hz+o.hz+6)return true;
  }
  return false;
}
/* a via de destino está livre ao lado do carro que quer trocar de faixa (inclusive de quem vem mais rápido por trás) */
export function laneFree(o,x){
  for(let n=0;n<obstacles.length;n++){
    const p=obstacles[n];
    if(p===o||!solid(p)||Math.abs(p.x-x)>=p.hw+o.hw+0.25)continue;
    const closing=p.d<o.d&&p.mv?Math.max(0,p.fv-o.fv)*1.8:0;
    if(Math.abs(p.d-o.d)<p.hz+o.hz+4+closing)return false;
  }
  return true;
}
/* perto de um cruzamento a via livre não muda; os carros transversais respeitam essa via */
function xNear(d){const b=Math.round(d/L);for(let k=-3;k<=3;k++){const i=b+k;if(isX(i)&&d>=i*L-30&&d<=i*L+16)return true;}return false;}
/* um carro de comprimento 2*hz em d ocupa a área do cruzamento (faixas incluídas)? */
function busyX(d,hz){const b=Math.round(d/L);for(let i=b-2;i<=b+2;i++)if(isX(i)&&Math.abs(d-i*L)<7.8+hz)return true;return false;}
function protLanes(ci){
  const c=ci*L;let b=1,a=null;
  for(let k=0;k<gen.hist.length;k++){const h=gen.hist[k];if(h.d<=c-4.6)b=h.safe;else if(h.d>c+4.6&&a===null)a=h.safe;}
  return (a===null||a===b)?[b]:[b,a];
}
function pickVeh(t){
  const w=[['sedan',3.2]];
  if(t>0.08)w.push(['van',1.8]);
  if(t>0.25)w.push(['truck',1.0+2.0*t]);
  let sum=0;w.forEach(x=>{sum+=x[1];});
  let r=Math.random()*sum;
  for(let i=0;i<w.length;i++){r-=w[i][1];if(r<=0)return w[i][0];}
  return 'sedan';
}
/* visual do pedestre: executivos de terno no centro da cidade, gente comum no resto */
const pedLook=d=>cityCore(Math.round(d/L))>0.5&&Math.random()<0.7?4+((Math.random()*2)|0):(Math.random()*4)|0;
export function spawn(type,d,x,ry){
  const def=OB[type], vi=type==='ped'?pedLook(d):(Math.random()*def.geos.length)|0, key=type+vi;
  const pool=pools[key]||(pools[key]=[]);
  let mesh=pool.pop();
  if(!mesh){const gm=def.geos[vi];mesh=new THREE.Mesh(gm,def.matsFn?def.matsFn():def.mats||(gm.groups.length?[M.vcol,M.lights,M.halo]:M.vcol));if(type==='barrier'||type==='crash'){const bc=makeBeacon();if(type==='crash')bc.position.set(0.2,0.55,0.3);mesh.add(bc);mesh.userData.bc=bc.userData.rays;}if(def.sg){const sgm=makeSig(def.sg);mesh.add(sgm.g);mesh.userData.sig=sgm;}
    /* sombra suave sob os veículos */
    if(def.kind==='veh'){const sh=new THREE.Mesh(SHADOW,M.blob);sh.scale.set(def.hw*2.1,1,def.hz*2.05);sh.position.y=0.03;mesh.add(sh);}
    scene.add(mesh);}
  if(mesh.userData.sig)sigSet(mesh.userData.sig,0,false);
  if(Array.isArray(mesh.material)&&mesh.material[0].userData.walk)mesh.material[0].userData.walk.set(0,0);   /* pedestre reaproveitado começa parado */
  mesh.geometry=def.geos[vi];
  mesh.visible=true;mesh.position.set(x,0,-d);mesh.rotation.set(0,ry||0,0);mesh.scale.setScalar(def.sc||1);
  const o={kind:def.kind,d:d,x:x,hw:def.hw,hz:def.hz,mesh:mesh,key:key,vi:vi,ph:0,hit:false,t:0,vx:0,vy:0,spin:0,walk:false,go:false,hh:def.hh||0,used:false,tp:type,cv:1,mv:false,lcTo:-1,sg:0};
  obstacles.push(o);return o;
}
const SIGG=new THREE.BoxGeometry(0.26,0.16,0.1), SHADOW=new THREE.BoxGeometry(1,0.01,1);
function makeSig(c){
  const g=new THREE.Group(),L=[],R=[];
  [[-1,L],[1,R]].forEach(function(p){[c.zf,c.zr].forEach(function(z){const b=new THREE.Mesh(SIGG,M.sig);b.position.set(p[0]*c.x,c.y,z);b.visible=false;g.add(b);p[1].push(b);});});
  return {g:g,L:L,R:R};
}
export function sigSet(sg,dir,on){sg.L.forEach(function(b){b.visible=on&&dir<0;});sg.R.forEach(function(b){b.visible=on&&dir>0;});}
export function releaseObstacle(o){o.mesh.visible=false;pools[o.key].push(o.mesh);}
/* pedestre atravessando na faixa de um cruzamento */
function zebraPed(i){
  if(gen.zebra.has(i))return false;
  gen.zebra.add(i);
  const side=Math.random()<0.5?-1:1, near=Math.random()<0.6;
  const o=spawn('ped',i*L+(near?-5.9:5.9),side*7.6,side>0?Math.PI/2:-Math.PI/2);
  o.walk=true;o.xcross=true;o.xci=i;o.dir=-side;o.vx=2.2+Math.random();o.lead=1.4+Math.random()*1.2;
  return true;
}
/* pedestres preferem a faixa: se houver cruzamento por perto, atravessam nele; fora dele só às vezes */
function addPed(d,avoid){
  const b=Math.round(d/L);
  for(let k=0;k<=6;k++)for(const i of [b+k,b-k]){
    if(isX(i)&&!underOf(i)&&i*L-6>ST.dist+50&&zebraPed(i))return;
  }
  if(busyAt(d,10))return;
  const r=Math.random();
  if(r<0.2){
    const side=Math.random()<0.5?-1:1;
    const o=spawn('ped',d,side*7.6,side>0?Math.PI/2:-Math.PI/2);
    o.walk=true;o.dir=-side;o.vx=2.4+Math.random()*1.2;o.lead=1.6+Math.random()*0.9;
  }else if(r<0.5){
    const ls=[0,1,2].filter(function(l){return l!==avoid;});
    spawn('ped',d,LANES[ls[(Math.random()*ls.length)|0]],Math.PI);
  }
}
function spawnAnimal(d,safe,desert){
  /* no deserto: feneco e lagarto; na mata: cervo, raposa e coelho */
  const type=desert?['fennec','lizard','lizard'][(Math.random()*3)|0]:['deer','deer','fox','rabbit'][(Math.random()*4)|0], side=Math.random()<0.5?-1:1, def=OB[type];
  const ls=[0,1,2].filter(function(l){return l!==safe;}), li=ls[(Math.random()*ls.length)|0];
  const o=spawn(type,d,side*9.2,side>0?Math.PI/2:-Math.PI/2);
  o.walk=true;o.animal=true;o.x0=side*9.2;o.dir=-side;o.xs=LANES[li];
  o.vs=type==='deer'?2.4:(type==='fox'||type==='fennec'?3.0:2.6);o.v=o.vs;o.ph=0;o.an=0;
  o.gt=type==='rabbit'?1/0.8:(type==='fox'?1/0.5:1/0.9);
  o.g0=def.geos[0];o.gw=def.walkG;o.hop=type==='rabbit'?0.28:0.05;
  o.lead=Math.abs(o.x0-o.xs)/o.vs+1.0;
}
/* animal: espera na beira, anda devagar até uma via, para no meio da pista e só segue depois que o carro passa */
export function updAnimal(o,dt,m){
  const tr=(o.d-ST.dist)/Math.max(ST.speed,8);
  if(o.an===0){
    if(tr<o.lead){o.an=1;o.v=clamp(Math.abs(o.x0-o.xs)/Math.max(0.4,tr-0.9),o.vs,13);}
  }else if(o.an===1){
    const nx=o.x+o.dir*o.v*dt;
    if(sideBlocked(o,nx))o.wait=true;else{o.wait=false;o.x=nx;}
    if((o.dir<0&&o.x<=o.xs)||(o.dir>0&&o.x>=o.xs)){o.x=o.xs;o.an=2;}
  }else if(o.an===2){
    if(tr<-0.12)o.an=3;
  }else{
    const nx=o.x+o.dir*Math.max(o.vs,o.v*0.6)*dt;
    if(sideBlocked(o,nx))o.wait=true;else{o.wait=false;o.x=nx;}
    if(Math.abs(o.x)>12)o.walk=false;
  }
  m.position.x=o.x;
  if((o.an===1||o.an===3)&&!o.wait){
    o.ph+=dt*Math.min(o.v*o.gt,7.5);
    m.geometry=o.gw[Math.floor(o.ph)&1];
    m.position.y=Math.abs(Math.sin(o.ph*Math.PI))*o.hop;
  }else{m.geometry=o.g0;m.position.y=0;}
}
/* cruzamentos da cidade: carros atravessando a pista e, às vezes, gente na faixa */
export function genCross(){
  while(gen.xi*L<ST.dist+AHEAD-24){
    const i=gen.xi++;
    if(!isX(i)||underOf(i)||bossClear(i*L))continue;   /* sem trânsito no trecho do chefe; sobre a passagem subterrânea o cruzamento fica lá em cima, fora do caminho */
    /* todos cruzam no mesmo sentido, com a mesma velocidade e bem espaçados; sem caminhões: assim a via nunca fecha por inteiro */
    const n=Math.random()<0.92?2+((Math.random()*3)|0):0;
    const side=Math.random()<0.5?-1:1, vx=13+Math.random()*5, gapT=22/vx, off=1.0+Math.random()*1.8;
    /* cada carro passa pelo centro do cruzamento (off + k*gapT) s antes do jogador chegar.
       Em alta velocidade o jogador chega logo: o carro já nasce no meio do caminho, não a 58 m. */
    const tr=(i*L-ST.dist)/Math.max(ST.speed,8);
    for(let k=0;k<n;k++){
      const T=tr-(off+k*gapT);
      if(T<0.4)continue;
      const type=['sedan','sedan','van'][(Math.random()*3)|0], def=OB[type], x0=Math.min(58,vx*T);
      const o=spawn(type,i*L,side*x0,side>0?Math.PI/2:-Math.PI/2);
      o.walk=true;o.xcar=true;o.xcross=true;o.xci=i;o.lim=70;o.dir=-side;o.vx=vx;
      o.hw=def.hz;o.hz=def.hw;
      o.lead=x0/vx+off+k*gapT;o.go=x0<58;
    }
    if(cfg.ped>0.05&&Math.random()<0.6)zebraPed(i);
  }
}
function makeZone(d){
  const zs=Math.max(gen.wzNext,d+170), ZL=70+Math.random()*90, ze=zs+ZL;
  for(let x=zs-160;x<=ze+20;x+=6){if(xNear(x)||busyAt(x,6)){gen.wzNext+=70;return;}}
  const l=Math.random()<0.5?0:2, X=LANES[l], q=[];
  q.push({d:zs-46,type:'cones',x:X},{d:zs-26,type:'cones',x:X},{d:zs-8,type:'barrier',x:X});
  for(let p=zs;p<ze;p+=L)q.push({d:p,type:'patch',x:X});
  const crash=Math.random()<0.3, mid=zs+ZL*0.5;
  for(let p=zs+16;p<ze-8;p+=22){if(crash&&Math.abs(p-mid)<14)continue;q.push({d:p,type:'cones',x:X});}
  if(crash)q.push({d:mid,type:'crash',x:X});
  q.push({d:ze+4,type:'barrels',x:X});
  q.sort(function(a,b){return a.d-b.d;});
  gen.wz={l:l,zs:zs,ze:ze};gen.wzQ=gen.wzQ.concat(q);
}
export function genWork(){
  const q=gen.wzQ;
  while(q.length&&q[0].d<ST.dist+AHEAD-8){
    const e=q.shift();
    if(bossClear(e.d))continue;
    spawn(e.type,e.d,e.x,(e.type==='cones'||e.type==='barrels')?(Math.random()-0.5)*0.4:0);
  }
}
export function genRow(){
  const d=gen.z, t=diff(d), v=Math.min(speedAt(d),ST.cur.vmax);
  /* trecho do chefe: pista completamente limpa */
  if(bossClear(d)){gen.z=d+24;gen.end=d;gen.lastD=[d,d,d];return;}
  const desert=desertAt(d)>0.5;
  const ix=Math.round(d/L), inX=isX(ix)&&Math.abs(d-ix*L)<10;
  /* trecho de obras: uma via estragada, sinalizada de ponta a ponta; as outras duas seguem livres */
  if(gen.wz&&d>gen.wz.ze+30){gen.wzNext=gen.wz.ze+900+Math.random()*900;gen.wz=null;}
  if(!gen.wz&&d>=gen.wzNext-260&&t>0.02&&!desert)makeZone(d);   /* no deserto não há obras: o obstáculo fixo é o buraco */
  const zA=gen.wz&&d>=gen.wz.zs-156&&d<=gen.wz.ze+12?gen.wz:null;
  const zon=gen.wz&&d>=gen.wz.zs-46&&d<=gen.wz.ze+12?gen.wz:null;
  if(gen.chic===0&&t>0.25&&Math.random()<0.10+0.22*t)gen.chic=2+((Math.random()*3)|0);
  const inChic=gen.chic>0;if(inChic)gen.chic--;
  const prev=gen.safe;let safe=prev;
  if(Math.random()<(inChic?1:0.28+0.4*t)){
    if(prev===0||prev===2)safe=1;else safe=Math.random()<0.5?0:2;
  }
  const nearX=xNear(d);
  if(nearX)safe=prev;
  if(gen.force>=0){safe=gen.force;gen.force=-1;}   /* depois de uma rampa, a via de aterrissagem fica livre */
  if(zon&&safe===zon.l)safe=1;
  let rampLane=-1;
  if(d>=gen.rampZ&&!inChic&&!inX&&!zA&&t>0.03&&!busyAt(d,16)){
    const cs=[0,1,2].filter(function(l){return Math.abs(l-safe)===1;});
    rampLane=cs[(Math.random()*cs.length)|0];
  }
  const info=[],movers=[],taken={};
  const p=inX?0:clamp((inChic?0.92:0.2+0.55*t)*cfg.dens,0,0.97);
  let hz=0,placed=0,holed=false;
  for(let l=0;l<3;l++){
    if(l===safe)continue;
    if(zA&&l===zA.l)continue;
    if(l===rampLane){
      spawn(desert?'dune':'ramp',d,LANES[l],0);gen.lastD[l]=d+OB.ramp.hz;   /* no deserto a rampa é uma duna */
      hz=Math.max(hz,OB.ramp.hz);placed++;gen.force=l;gen.rampZ=d+300+Math.random()*260;
      continue;
    }
    if(desert&&!holed&&Math.random()<p*0.18){
      holed=true;
      /* buraco parado na via */
      spawn('hole',d,LANES[l]+(Math.random()-0.5)*0.6,Math.random()*6.28);gen.lastD[l]=d+OB.hole.hz;
      hz=Math.max(hz,OB.hole.hz);placed++;info[l]=OB.hole.hz;continue;
    }
    if(Math.random()<p*(desert?0.6:1)&&!(nearX&&placed>=1)){
      /* todo veículo está rodando: sai de trás e chega à posição da fileira justamente quando o jogador o alcança */
      const type=pickVeh(t), def=OB[type];
      let fv=Math.min(7+Math.random()*7,0.6*v);if(type==='truck')fv=Math.min(fv,9);
      const d0=d-fv*(d-ST.dist)/Math.max(v,fv+8);
      if(d0-def.hz-3>gen.lastD[l]&&!busyX(d0,def.hz)){
        const o=spawn(type,d0,LANES[l],0);o.mv=true;o.fv=fv;o.dc=d;movers.push({o:o,l:l});
        gen.lastD[l]=d+def.hz;hz=Math.max(hz,def.hz);placed++;info[l]=def.hz;
      }
    }
  }
  /* alguns carros em movimento dão seta e trocam para uma via vizinha que está vazia nesta fileira */
  movers.forEach(function(mv){
    if(Math.random()>0.45)return;
    const c=[mv.l-1,mv.l+1].filter(function(a){return a>=0&&a<=2&&a!==safe&&a!==rampLane&&!(zA&&a===zA.l)&&info[a]===undefined&&!taken[a]&&d-11-OB[mv.o.tp].hz>gen.lastD[a];});
    if(!c.length)return;
    const a=c[(Math.random()*c.length)|0];
    mv.o.lcTo=a;mv.o.lcDir=a>mv.l?1:-1;mv.o.lcTr=3+Math.random()*0.8;taken[a]=true;
  });
  const react=inChic?lerp(0.82,0.6,t):lerp(1.3,0.72,t);
  let gap=Math.max(v*react*(0.92+Math.random()*0.25),hz+3.6+v*0.36,16);
  if(!placed)gap=Math.max(16,gap*0.55);
  /* moedas: linha longa numa via qualquer, na faixa livre entre fileiras */
  if(gap>22&&Math.random()<0.95){
    const cl=Math.random()<0.6?safe:((Math.random()*3)|0);
    for(let k=0;k<7;k++){const cd=d+hz+3+k*2.6;if(cd<d+gap*0.55&&coinList.length<MAXC)coinList.push({d:cd,lane:cl});}
  }
  /* moedas em arco sobre a rampa */
  if(rampLane>=0){
    const vy=7.4+0.02*v, T=(vy+Math.sqrt(vy*vy+2*GJ*1.05))/GJ;
    for(let k=1;k<=5;k++){
      const tt=T*k/6;
      if(coinList.length<MAXC)coinList.push({d:d-0.4+v*tt,lane:rampLane,y:2.1+vy*tt-0.5*GJ*tt*tt});
    }
  }
  /* chave inglesa: sempre em ponto arriscado, logo antes de um obstáculo (exige desviar em cima da hora) */
  /* tanque de combustível: no meio do vão entre fileiras, de 450 a 750 m */
  if(d>=gen.fuelZ&&gap>18){fuelList.push({d:d+gap*0.5,lane:Math.random()<0.6?safe:((Math.random()*3)|0)});gen.fuelZ=d+450+Math.random()*300;}
  if(d>=gen.wrZ){
    const ls=[0,1,2].filter(function(l){return info[l]!==undefined;});
    if(ls.length){
      const l=ls[(Math.random()*ls.length)|0], dw=d-info[l]-7.5;
      if(dw>gen.end+2){wrenchList.push({d:dw,lane:l});gen.wrZ=d+520+Math.random()*420;}
    }
  }
  /* pedestres: raros, com distância mínima entre eles e fora da via livre */
  /* animais só na mata: um deles pula na estrada de vez em quando */
  if(cityK(Math.round((d+gap*0.5)/L))<0.2&&!inX&&gap>26&&d>=gen.anZ&&rampLane<0&&!busyAt(d+gap*0.5,10)){
    spawnAnimal(d+gap*0.5,safe,desertAt(d+gap*0.5)>0.5);
    gen.force=safe;   /* a via livre continua a mesma depois do animal */
    gen.anZ=d+gap+150+Math.random()*230;
  }
  if(cfg.ped>0.05&&cityK(Math.round((d+gap*0.5)/L))>0.65&&!inX&&gap>34&&d>=gen.pedZ){
    addPed(d+gap*0.5,safe);
    gen.pedZ=d+gap+(lerp(160,110,t)+Math.random()*120)/cfg.ped;
  }
  gen.hist.push({d:d,safe:safe});if(gen.hist.length>40)gen.hist.shift();
  gen.safe=safe;gen.z=d+gap;gen.end=d+hz+1.7;
}
