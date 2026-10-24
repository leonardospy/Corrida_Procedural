/* Laço principal e inicialização */
import './dom.js';
import './config.js';
import './scene.js';
import './geometry.js';
import './vehicles.js';
import './obstacles.js';
import './scenery.js';
import './track.js';
import './showroom.js';
import './save.js';
import './player.js';
import './state.js';
import './generator.js';
import './effects.js';
import './audio.js';
import './hud.js';
import './menu.js';
import './race.js';
import './physics.js';
import './render.js';
import './input.js';
import {ST} from './shared.js';
import {cfg} from './config.js';
import {bendU} from './scene.js';
import {renderFrame} from './post.js';
import {save} from './save.js';
import {showCarModel} from './player.js';
import {audioTick} from './audio.js';
import {hudUpdate} from './hud.js';
import {applyCfg,showPanel} from './menu.js';
import {resetRun,snapCamera} from './race.js';
import {updateCrash,updatePlay} from './physics.js';
import {updateCamera,updateWorld} from './render.js';
import {applySound} from './input.js';

/* ------------------------------------------------------------------ */
/* Laço principal                                                      */
/* ------------------------------------------------------------------ */
ST.last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,Math.max(0,(now-ST.last)/1000));ST.last=now;
  if(ST.state==='play')updatePlay(dt,now);
  else if(ST.state==='crash')updateCrash(dt);
  updateWorld(ST.state==='paused'?0:dt,now);
  updateCamera(dt,now);
  if(ST.state==='play'||ST.state==='crash')hudUpdate();
  const toon=cfg.style>=0.5;bendU.uToon.value=toon?1:0;
  renderFrame(toon);
  audioTick();
}

/* só no servidor de desenvolvimento (npm run dev): atalhos para testar pelo console, sem depender do laço */
if(import.meta.env&&import.meta.env.DEV)window.__dev={ST:ST,showCar:showCarModel,
  step:function(n,dt){for(let k=0;k<(n||1);k++){const now=performance.now();if(ST.state==='play')updatePlay(dt||0.016,now);updateWorld(dt||0.016,now);updateCamera(dt||0.016,now);}
    const toon=cfg.style>=0.5;bendU.uToon.value=toon?1:0;renderFrame(toon);}};

showCarModel(save.car);
applySound();
applyCfg();
resetRun();
ST.menuK=1;
showPanel('main');
snapCamera();
requestAnimationFrame(frame);