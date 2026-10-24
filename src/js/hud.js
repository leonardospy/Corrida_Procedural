/* HUD da corrida */
import {ST} from './shared.js';
import {$} from './dom.js';
import {CONFUSE_T,LEVEL_M,V0,clamp,fmt} from './config.js';
import {PAL} from './scene.js';

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */
export const hud=$('hud'),elScore=$('score'),elDist=$('dist'),elCoins=$('coins'),elKmh=$('kmh'),elBar=$('bar'),elLvl=$('lvl'),elStage=$('stage');
const toastEl=$('toast'),confEl=$('conf'),confBar=$('confBar'),hpEl=$('hp');
ST.hSc=-1;ST.hDist=-1;ST.hCoins=-1;ST.hKmh=-1;ST.hLvl=-1;ST.hStage=-1;
export function toast(t,s){
  $('toastT').textContent=t;$('toastS').textContent=s||'';
  toastEl.classList.remove('show');void toastEl.offsetWidth;toastEl.classList.add('show');
}
export function updateHp(){
  const pips=hpEl.querySelectorAll('i');
  pips.forEach((p,i)=>p.classList.toggle('off',i>=3-ST.hits));
}
export function hudUpdate(){
  const sc=Math.floor(ST.dist)+ST.coins*10;
  if(sc!==ST.hSc){ST.hSc=sc;elScore.textContent=fmt(sc);}
  const dm=Math.floor(ST.dist);if(dm!==ST.hDist){ST.hDist=dm;elDist.textContent=fmt(dm);}
  if(ST.coins!==ST.hCoins){ST.hCoins=ST.coins;elCoins.textContent=ST.coins;}
  const kmh=Math.round(ST.speed*3.6);if(kmh!==ST.hKmh){ST.hKmh=kmh;elKmh.textContent=kmh;}
  elBar.style.transform='scaleX('+clamp((ST.speed-V0)/(ST.cur.vmax-V0),0,1).toFixed(3)+')';
  const lv=Math.floor(ST.dist/LEVEL_M)+1;if(lv!==ST.hLvl){ST.hLvl=lv;elLvl.textContent='Nível '+lv;}
  const st=Math.floor(ST.dist/ST.STAGE_M)%PAL.length;if(st!==ST.hStage){ST.hStage=st;elStage.textContent=PAL[st].name;}
  const cf=ST.confuse>0;
  if(confEl.hidden===cf)confEl.hidden=!cf;
  if(cf)confBar.style.transform='scaleX('+clamp(ST.confuse/CONFUSE_T,0,1).toFixed(3)+')';
}
