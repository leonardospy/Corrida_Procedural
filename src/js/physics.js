/* Física da corrida: movimento, colisões, saltos e coleta */
import {ST} from './shared.js';
import {AHEAD,L,LANES,LEVEL_M,clamp,fmt,lerp,speedAt} from './config.js';
import {PAL} from './scene.js';
import {drawSign,gantries} from './obstacles.js';
import {updateProps} from './scenery.js';
import {GJ,coinList,obstacles,wrenchList} from './state.js';
import {gen,genCross,genRow,genWork,laneFree,leaderLimit,releaseObstacle,sideBlocked,sigSet,updAnimal} from './generator.js';
import {OB} from './obstacles.js';
import {busyAt,underOf} from './tunnels.js';
import {emitDust,emitSmoke} from './effects.js';
import {blip,noise} from './audio.js';
import {toast,updateHp} from './hud.js';
import {gameOver,hitObstacle} from './race.js';

export function updatePlay(dt,now){
  const target=Math.min(speedAt(ST.dist),ST.cur.vmax);
  ST.speed=Math.min(target,ST.speed+ST.cur.accel*dt);
  const prevD=ST.dist;
  ST.dist+=ST.speed*dt;ST.topSpeed=Math.max(ST.topSpeed,ST.speed);
  ST.px+=(LANES[ST.lane]-ST.px)*(1-Math.exp(-dt*17));
  /* saída da passagem subterrânea: o carro sobe a rampa embalado e dá um pequeno salto */
  const up=underOf(Math.floor(ST.dist/L+0.5));
  if(up&&!ST.airborne){
    const lp=up.de-up.ramp*0.18;
    if(prevD<lp&&ST.dist>=lp){ST.airborne=true;ST.hop=true;ST.carVy=clamp(ST.speed*0.15,4.5,8);ST.jumpD0=ST.dist;noise(0.15,0.12,500);}
  }
  if(ST.airborne){
    ST.carY+=ST.carVy*dt;ST.carVy-=GJ*dt;
    if(ST.carY<=0){
      const imp=-ST.carVy;ST.carY=0;ST.carVy=0;ST.airborne=false;
      ST.shake=Math.max(ST.shake,Math.min(0.7,imp/22));noise(0.2,0.25,650);
      if(!ST.hop)toast('Salto!',Math.round(ST.dist-ST.jumpD0)+' m');
      ST.hop=false;
    }
  }
  emitDust(dt);
  if(ST.inv>0)ST.inv-=dt;
  if(ST.confuse>0){ST.confuse-=dt;if(ST.confuse<=0){ST.confuse=0;toast('Comandos normais','');}}

  while(gen.z<ST.dist+AHEAD)genRow();
  genCross();
  genWork();
  while(ST.gantryNext<ST.dist+AHEAD){
    /* o pórtico marca o nível; se cair em cruzamento, túnel ou passagem, vai um pouco adiante */
    let gd=ST.gantryNext;for(let k=0;k<20&&busyAt(gd,8);k++)gd+=L;
    const gt=gantries.find(g=>!g.on);
    if(gt){gt.on=true;gt.d=gd;gt.grp.position.set(0,0,-gd);gt.grp.visible=true;drawSign(gt,ST.gantryNext);}
    ST.gantryNext+=LEVEL_M;
  }
  gantries.forEach(g=>{if(g.on&&g.d<ST.dist-40){g.on=false;g.grp.visible=false;}});
  updateProps();

  ST.rampY=0;
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i], m=o.mesh;
    if(o.hit){
      o.t+=dt;m.position.x+=o.vx*dt;m.position.y=Math.max(0,m.position.y+o.vy*dt);o.vy-=22*dt;
      m.rotation.y+=o.spin*dt;m.rotation.z+=o.spin*dt*0.5;
      if(o.t>1.4)m.visible=false;
      if(o.d<ST.dist-30){releaseObstacle(o);obstacles.splice(i,1);}
      continue;
    }
    if(o.d<ST.dist-30){releaseObstacle(o);obstacles.splice(i,1);continue;}
    if(o.walk){
      if(o.animal)updAnimal(o,dt,m);
      else{
        if(!o.go&&o.d-ST.dist<ST.speed*o.lead)o.go=true;
        if(o.go){
          if(o.xcar)m.visible=true;
          const nx=o.x+o.dir*o.vx*o.cv*dt, stop=sideBlocked(o,nx);
          if(!stop){o.x=nx;o.ph+=dt*o.vx*1.6;}
          m.position.x=o.x;m.position.y=0;
          /* pedestre: alterna as poses de passo; parado esperando, fica em pé */
          if(o.tp==='ped'){const W=OB.ped.walkV[o.vi];m.geometry=stop?OB.ped.geos[o.vi]:W[Math.floor(o.ph)%W.length];}
          if(Math.abs(o.x)>(o.lim||8.5))o.walk=false;
        }
      }
    }
    if(o.mv){
      o.d=Math.max(o.d,Math.min(o.d+o.fv*dt,leaderLimit(o)));m.position.z=-o.d;m.position.y=Math.sin(now*0.02+o.dc)*0.012;
      if(o.lcTo>=0&&o.sg<3){
        const tr=(o.d-ST.dist)/Math.max(ST.speed,8), sg=m.userData.sig, bl=Math.floor(now/300)%2===0;
        if(o.sg===0&&tr<o.lcTr){
          const av=tr-0.7;
          if(av<1.2)o.lcTo=-1;
          else{o.sg=1;o.sgT=0;o.sgD=clamp(av*0.5,0.5,1.1);o.mvD=clamp(av-o.sgD,0.5,1.0);}
        }
        if(o.sg===1){
          o.sgT+=dt;sigSet(sg,o.lcDir,bl);
          if(o.sgT>=o.sgD){
            /* só troca de faixa se a via ao lado estiver livre; senão desiste e apaga a seta */
            if(laneFree(o,LANES[o.lcTo])){o.sg=2;o.sgT=0;o.xF=o.x;}
            else{o.sg=3;sigSet(sg,0,false);}
          }
        }else if(o.sg===2){
          o.sgT+=dt;const u=Math.min(1,o.sgT/o.mvD), e=u*u*(3-2*u);
          o.x=lerp(o.xF,LANES[o.lcTo],e);m.position.x=o.x;m.rotation.y=-o.lcDir*0.18*Math.sin(Math.PI*u);
          sigSet(sg,o.lcDir,bl);
          if(u>=1){o.sg=3;sigSet(sg,0,false);m.rotation.y=0;}
        }
      }
    }
    if(o.kind==='deco')continue;
    if(o.kind==='ramp'){
      const a=o.d-ST.dist, on=Math.abs(ST.px-o.x)<1.5;
      if(on&&!o.used&&!ST.airborne&&a<=0.4&&a>-1.5){
        o.used=true;ST.airborne=true;ST.carY=Math.max(ST.carY,1.05);ST.carVy=7.4+0.02*ST.speed;ST.jumpD0=ST.dist;
        blip(420,980,0.28,'triangle',0.09);
      }else if(on&&!ST.airborne&&a>0.4&&a<3.4)ST.rampY=Math.max(ST.rampY,1.05*(3.4-a)/3.0);
      continue;
    }
    if(Math.abs(o.d-ST.dist)<o.hz+1.7&&Math.abs(ST.px-o.x)<0.8+o.hw&&ST.carY<o.hh-0.15&&m.position.y<1.3){hitObstacle(o);if(ST.state!=='play')return;}
  }
  if(!ST.airborne)ST.carY=ST.rampY;
  ST.carPitch+=((ST.airborne?clamp(ST.carVy*0.03,-0.4,0.4):(ST.rampY>0.02?0.33:0))-ST.carPitch)*(1-Math.exp(-dt*14));
  for(let i=coinList.length-1;i>=0;i--){
    const c=coinList[i];
    if(c.d<ST.dist-20){coinList.splice(i,1);continue;}
    if(Math.abs(c.d-ST.dist)<1.8&&Math.abs(ST.px-LANES[c.lane])<1.4){
      coinList.splice(i,1);ST.coins++;blip(880,1320,0.12,'square',0.07);
    }
  }
  for(let i=wrenchList.length-1;i>=0;i--){
    const w=wrenchList[i];
    if(w.d<ST.dist-20){wrenchList.splice(i,1);continue;}
    if(Math.abs(w.d-ST.dist)<2.0&&Math.abs(ST.px-LANES[w.lane])<1.4&&ST.carY<2.5){
      wrenchList.splice(i,1);
      if(ST.hits>0){ST.hits--;updateHp();toast('Reparo!','+1 de casco');}
      else{ST.coins+=5;toast('Casco inteiro','+5 moedas');}
      blip(520,1040,0.12,'triangle',0.09);setTimeout(function(){blip(780,1560,0.14,'triangle',0.09);},110);
    }
  }
  const lv=Math.floor(ST.dist/LEVEL_M)+1;
  if(lv>ST.lastLevel){
    ST.lastLevel=lv;
    const st=Math.floor(ST.dist/ST.STAGE_M);
    if(st>ST.lastStage){ST.lastStage=st;toast(PAL[st%PAL.length].name,'Novo cenário · Nível '+lv);}
    else toast('Nível '+lv,fmt(ST.dist)+' m');
  }
  emitSmoke(dt);
  ST.shake*=Math.exp(-dt*4);
}
export function updateCrash(dt){
  ST.crashT+=dt;
  ST.speed*=Math.exp(-dt*2.4);ST.dist+=ST.speed*dt;
  ST.carY+=ST.carVy*dt;ST.carVy-=26*dt;
  if(ST.carY<0){ST.carY=0;ST.carVy*=-0.3;if(Math.abs(ST.carVy)<1)ST.carVy=0;}
  ST.px=clamp(ST.px+ST.carVx*dt,-6.1,6.1);ST.carVx*=Math.exp(-dt*1.2);
  const air=ST.carY>0.05?1:0.2;
  ST.carRz+=ST.carSpin*dt*air;ST.carRx+=ST.carSpin*0.4*dt*air;ST.carSpin*=Math.exp(-dt*0.6);
  emitSmoke(dt);
  ST.shake*=Math.exp(-dt*3);
  if(ST.crashT>1.3)gameOver();
}
