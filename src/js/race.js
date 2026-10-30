/* Ciclo da corrida: início, fim, pausa e batidas */
import {ST} from './shared.js';
import {$} from './dom.js';
import {BEHIND_T,CONFUSE_T,L,LEVEL_M,V0,clamp,fmt,speedAt} from './config.js';
import {carById} from './vehicles.js';
import {gantries} from './obstacles.js';
import {resetProps,skipProps} from './scenery.js';
import {I,hideI,sw} from './track.js';
import {persist,save} from './save.js';
import {showCarModel} from './player.js';
import {coinList,fuelList,obstacles,wrenchList} from './state.js';
import {gen,releaseObstacle,resetGen} from './generator.js';
import {debris,dust,smokeP,spawnDebris} from './effects.js';
import {audioInit,blip,noise} from './audio.js';
import {hud,hudUpdate,toast,updateHp} from './hud.js';
import {showPanel} from './menu.js';
import {camTargets} from './render.js';
import {BOSSES,resetBoss} from './boss.js';

/* ------------------------------------------------------------------ */
/* Ciclo da corrida                                                    */
/* ------------------------------------------------------------------ */
let cutting=false;
const fadeEl=$('fade');
function cut(fn){
  if(cutting)return;cutting=true;fadeEl.classList.add('on');
  setTimeout(()=>{fn();fadeEl.classList.remove('on');cutting=false;},210);
}
function releaseAll(){
  sw.forEach(function(w){w.on=false;});
  obstacles.forEach(releaseObstacle);obstacles.length=0;coinList.length=0;wrenchList.length=0;fuelList.length=0;
  gantries.forEach(g=>{g.on=false;g.grp.visible=false;});resetProps();
  debris.forEach(d=>{d.life=0;});smokeP.forEach(s=>{s.life=0;});dust.forEach(d=>{d.life=0;});
}
export function resetRun(){
  ST.dist=0;ST.speed=0;ST.lane=1;ST.px=0;ST.coins=0;ST.topSpeed=0;ST.crashT=0;ST.shake=0;
  ST.carY=0;ST.carVy=0;ST.carVx=0;ST.carSpin=0;ST.carRz=0;ST.carRx=0;ST.airborne=false;ST.hop=false;ST.carPitch=0;ST.rampY=0;
  ST.fuel=100;ST.fuelWarn=false;ST.fuelOut=false;
  ST.hits=0;ST.inv=0;ST.confuse=0;ST.smokeAcc=0;ST.deathCause='hit';
  ST.lastLevel=1;ST.lastStage=0;ST.gantryNext=LEVEL_M;
  releaseAll();resetGen();resetBoss();
  for(const k in I){for(let i=0;i<I[k].count;i++)hideI(I[k],i);}
  ST.lastTile=-BEHIND_T-1;ST.dirty=true;
  ST.hSc=ST.hDist=ST.hCoins=ST.hKmh=ST.hLvl=ST.hStage=ST.hFuel=-1;
  updateHp();
}
/* leva a corrida direto para a distância d, com o gerador, a pista e as placas acertados para lá */
function jumpTo(d){
  ST.dist=d;ST.speed=Math.min(speedAt(d),ST.cur.vmax)*0.8;
  gen.z=d+40;gen.xi=Math.ceil(d/L);gen.wzNext=d+2000;gen.rampZ=d+300;gen.wrZ=d+300;gen.fuelZ=d+150;gen.pedZ=d+200;gen.anZ=d+200;gen.end=d;gen.lastD=[d,d,d];
  ST.lastTile=Math.floor(d/L)-BEHIND_T-1;
  ST.lastLevel=Math.floor(d/LEVEL_M)+1;ST.lastStage=Math.floor(d/ST.STAGE_M);ST.gantryNext=Math.ceil(d/LEVEL_M)*LEVEL_M;
  skipProps(d);
}
export function snapCamera(){
  const c=camTargets();
  ST.camX=c.tx;ST.camY=c.ty;ST.camO=c.to;ST.lkX=c.lx;ST.lkY=c.ly;ST.lkO=c.lo;ST.vox=c.tox;ST.voy=c.toy;
}
/* bossTest: começa pouco antes do primeiro chefe (botão de teste do menu; essa corrida não conta recorde nem moedas) */
export function startRun(bossTest){
  if(cutting)return;
  audioInit();
  cut(()=>{
    ST.cur=carById(save.car);showCarModel(save.car);
    resetRun();ST.menuK=0;
    ST.speed=8;ST.state='play';ST.runSaved=false;ST.testRun=bossTest===true;
    if(ST.testRun)jumpTo(BOSSES[0].at-260);
    $('menu').hidden=true;$('ovOver').hidden=true;$('ovPause').hidden=true;hud.hidden=false;
    snapCamera();hudUpdate();toast('Largada','Nível 1');
  });
}
export function goMenu(){
  if(cutting)return;
  cut(()=>{
    resetRun();ST.state='menu';ST.menuK=1;
    hud.hidden=true;$('ovOver').hidden=true;$('ovPause').hidden=true;$('menu').hidden=false;
    ST.shopSel=save.car;showPanel('main');snapCamera();
  });
}
export function finishRun(){
  if(ST.runSaved)return {sc:0,rec:false};
  ST.runSaved=true;
  const sc=Math.floor(ST.dist)+ST.coins*10;
  if(ST.testRun)return {sc:sc,rec:false};
  save.coins+=ST.coins;
  const prevBest=save.best||0, rec=sc>prevBest&&sc>0;
  if(rec)save.best=sc;
  save.bestD=Math.max(save.bestD||0,Math.floor(ST.dist));
  if(ST.dist>=50||ST.coins>0){
    save.records.push({s:sc,d:Math.floor(ST.dist),k:ST.coins,c:ST.cur.name});
    save.records.sort((a,b)=>b.s-a.s);save.records=save.records.slice(0,5);
  }
  persist();
  return {sc:sc,rec:rec};
}
export function pause(){
  if(ST.state!=='play')return;
  ST.state='paused';$('ovPause').hidden=false;
}
export function resume(){
  if(ST.state!=='paused')return;
  ST.state='play';$('ovPause').hidden=true;ST.last=performance.now();
}
export function moveLane(dir){
  if(ST.state!=='play')return;
  if(ST.confuse>0)dir=-dir;
  const n=clamp(ST.lane+dir,0,2);
  if(n===ST.lane)return;
  ST.lane=n;noise(0.09,0.05,1800);
}
function crash(cause){
  ST.state='crash';ST.crashT=0;ST.shake=1;ST.airborne=false;ST.deathCause=cause;ST.confuse=0;
  ST.carVy=7+ST.speed*0.05;ST.carVx=(Math.random()<0.5?-1:1)*(2+Math.random()*3);
  ST.carSpin=(Math.random()<0.5?-1:1)*(5+Math.random()*4);
  spawnDebris(1);noise(0.6,0.5,900);blip(160,40,0.4,'sawtooth',0.12);
}
export function gameOver(){
  ST.state='over';
  const r=finishRun();
  $('oTitle').textContent=ST.deathCause==='wreck'?'Carro destruído':(ST.deathCause==='fuel'?'Sem combustível':'Batida');
  $('oScore').textContent=fmt(r.sc);
  $('oDist').textContent=fmt(ST.dist);
  $('oSpeed').textContent=Math.round(ST.topSpeed*3.6);
  $('oCoins').textContent=ST.coins;
  $('oBest').textContent=fmt(save.best||0);
  $('oNew').hidden=!r.rec;
  hud.hidden=true;$('ovOver').hidden=false;
}
export function hitObstacle(o){
  if(o.kind==='fatal'){crash('hit');return;}
  if(o.kind==='ped'){
    o.hit=true;o.vx=(o.x>=ST.px?1:-1)*(5+Math.random()*3);o.vy=8;o.spin=(Math.random()-0.5)*14;
    ST.confuse=CONFUSE_T;ST.speed=Math.max(ST.speed*0.88,V0*0.6);ST.shake=Math.max(ST.shake,0.5);
    toast(o.animal?'Animal na pista!':'Atropelou!','Comandos invertidos');noise(0.25,0.25,700);blip(300,120,0.25,'square',0.08);
    return;
  }
  if(ST.inv>0)return;
  if(o.kind==='hole'){o.kind='deco';damage('Buraco!');return;}   /* o buraco fica na pista, mas não acerta de novo */
  o.hit=true;o.vx=(o.x>=ST.px?1:-1)*(4+Math.random()*3);o.vy=5;o.spin=(Math.random()-0.5)*5;
  damage(o.kind==='spike'?'Espinhos!':'Batida!');
}
/* 1 de dano no casco (batida, buraco, espinhos, polícia); 3 danos destroem o carro */
export function damage(title){
  if(ST.inv>0||ST.state!=='play')return;
  ST.hits++;updateHp();
  if(ST.hits>=3){crash('wreck');return;}
  ST.inv=0.8;ST.speed=Math.max(ST.speed*0.72,V0*0.6);ST.shake=0.9;
  spawnDebris(0.5);noise(0.35,0.35,1100);
  toast(ST.hits===1?title:'Casco crítico!',ST.hits===1?'Restam 2 batidas':'Mais uma e acabou');
}
