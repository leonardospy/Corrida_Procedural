/* Entrada: teclado, toque e botões */
import {ST} from './shared.js';
import {$,canvas} from './dom.js';
import {cfg} from './config.js';
import {audioInit,master} from './audio.js';
import {panels,showPanel} from './menu.js';
import {finishRun,goMenu,moveLane,pause,resume,startRun} from './race.js';

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */
window.addEventListener('keydown',e=>{
  const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A'){if(ST.state==='play'){e.preventDefault();if(!e.repeat)moveLane(-1);}}
  else if(k==='ArrowRight'||k==='d'||k==='D'){if(ST.state==='play'){e.preventDefault();if(!e.repeat)moveLane(1);}}
  else if(k===' '||k==='Enter'||k==='Escape'||k==='p'||k==='P'){
    if(e.target&&(e.target.tagName==='BUTTON'||(e.target.classList&&e.target.classList.contains('car')))&&(k===' '||k==='Enter'))return;
    e.preventDefault();if(e.repeat)return;
    if(ST.state==='menu'){
      if((k===' '||k==='Enter')&&!panels.main.hidden)startRun();
      else if(k==='Escape')showPanel('main');
    }
    else if(ST.state==='over'){if(k===' '||k==='Enter')startRun();}
    else if(ST.state==='play')pause();
    else if(ST.state==='paused')resume();
  }
});
let ptr=null;
canvas.addEventListener('pointerdown',e=>{
  ptr={x:e.clientX,done:false};
  try{canvas.setPointerCapture(e.pointerId);}catch(x){}
});
canvas.addEventListener('pointermove',e=>{
  if(!ptr)return;
  const dx=e.clientX-ptr.x;
  if(ST.state==='menu'){ST.spin+=dx*0.012;ptr.x=e.clientX;return;}
  if(Math.abs(dx)>34){moveLane(dx>0?1:-1);ptr.x=e.clientX;ptr.done=true;}
});
canvas.addEventListener('pointerup',e=>{
  if(!ptr)return;
  if(!ptr.done&&ST.state==='play'){const r=canvas.getBoundingClientRect();moveLane(e.clientX<r.left+r.width/2?-1:1);}
  ptr=null;
});
canvas.addEventListener('pointercancel',()=>{ptr=null;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',pause);

$('btnRetry').addEventListener('click',startRun);
$('btnOverMenu').addEventListener('click',goMenu);
$('btnResume').addEventListener('click',resume);
$('btnPauseMenu').addEventListener('click',()=>{finishRun();goMenu();});
$('btnPause').addEventListener('click',()=>{if(ST.state==='play')pause();else if(ST.state==='paused')resume();});
export function applySound(){
  $('btnSound').classList.toggle('muted',ST.muted);$('btnSound2').classList.toggle('muted',ST.muted);
  if(master)master.gain.value=ST.muted?0:0.7*cfg.vol/100;
}
function toggleSound(){
  ST.muted=!ST.muted;applySound();
  try{localStorage.setItem('corrida-procedural-mute',ST.muted?'1':'0');}catch(e){}
}
$('btnSound').addEventListener('click',toggleSound);
$('btnSound2').addEventListener('click',()=>{audioInit();toggleSound();});
