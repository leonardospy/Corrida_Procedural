/* Chefes: em distâncias fixas a pista fica limpa e um perseguidor entra em cena.
   Polícia (20 km): avisa a faixa, vem por trás (acerta quem estiver nela), passa, fica à frente trocando de faixa e
   jogando espinhos; depois de 5 km perde o controle, sai da pista e explode. */
import {ST} from './shared.js';
import {$} from './dom.js';
import {LANES,clamp,lerp} from './config.js';
import {patch,scene} from './scene.js';
import {makePolice} from './vehicles.js';
import {spawn} from './generator.js';
import {damage} from './race.js';
import {toast} from './hud.js';
import {blip,noise,sirenLevel} from './audio.js';
import {explode} from './effects.js';

/* para criar outro chefe, basta outra linha aqui (at = início em metros, len = duração da batalha) */
export const BOSSES=[{at:20000,len:5000,name:'Polícia',reward:50}];
const LEAD=55, WARN_T=2.4, PASS_V=24;

const cop=makePolice();cop.g.visible=false;scene.add(cop.g);
/* faixa de aviso no chão, atrás do jogador, piscando vermelho/azul */
const warnMat=patch(new THREE.MeshBasicMaterial({color:0xff2030,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
const warn=new THREE.Mesh(new THREE.PlaneGeometry(3,34),warnMat);warn.rotation.x=-Math.PI/2;warn.visible=false;scene.add(warn);

const B={i:-1,phase:'idle',t:0,d:0,x:0,lane:1,tx:0,laneT:0,dropT:0,hitDone:false,vx:0,spin:0,y:0,vy:0};
const el={box:$('boss'),name:$('bossName'),bar:$('bossBar'),lanes:$('bossLanes')};

export function resetBoss(){
  B.i=-1;B.phase='idle';cop.g.visible=false;warn.visible=false;el.box.hidden=true;sirenLevel(0);
}
/* a pista fica limpa um pouco antes do chefe até ele sair de cena */
export function bossClear(d){
  for(let n=0;n<BOSSES.length;n++){const b=BOSSES[n];if(d>=b.at-140&&d<=b.at+b.len+300)return true;}
  return false;
}
function place(){cop.g.position.set(B.x,B.y,-B.d);cop.g.rotation.set(0,B.spin,B.phase==='crash'?B.spin*0.3:0);}
function laneUI(on){
  el.lanes.hidden=!on;
  const cells=el.lanes.querySelectorAll('i');cells.forEach(function(c,k){c.classList.toggle('on',on&&k===B.lane);});
}

export function updateBoss(dt,now){
  /* começa o próximo chefe quando o jogador chega na distância dele */
  if(B.phase==='idle'){
    const n=BOSSES.findIndex((b,k)=>k>B.i&&ST.dist>=b.at);
    if(n<0)return;
    B.i=n;B.phase='warn';B.t=0;B.lane=ST.lane;   /* vem pela faixa onde o jogador está: é preciso sair dela */
    el.box.hidden=false;el.name.textContent=BOSSES[n].name;el.bar.style.transform='scaleX(1)';laneUI(true);
    toast('Polícia!','Saia da faixa marcada');blip(700,1100,0.3,'square',0.06);
  }
  const b=BOSSES[B.i];
  B.t+=dt;
  const flash=Math.floor(now/140)%2===0;
  cop.red.visible=flash;cop.blue.visible=!flash;
  el.bar.style.transform='scaleX('+clamp(1-(ST.dist-b.at)/b.len,0,1).toFixed(3)+')';

  if(B.phase==='warn'){
    /* avisa por qual faixa vem: faixa piscando no chão atrás do carro e no painel */
    warn.visible=true;warnMat.color.setHex(flash?0xff2030:0x2050ff);warnMat.opacity=0.55;
    warn.position.set(LANES[B.lane],0.05,-(ST.dist-18));
    sirenLevel(B.t/WARN_T);
    if(B.t>=WARN_T){B.phase='pass';B.t=0;B.d=ST.dist-38;B.x=LANES[B.lane];B.y=0;B.spin=0;B.hitDone=false;cop.g.visible=true;}
  }else if(B.phase==='pass'){
    warn.position.set(LANES[B.lane],0.05,-(ST.dist-18));warnMat.color.setHex(flash?0xff2030:0x2050ff);
    sirenLevel(1);
    const prev=B.d;B.d+=(ST.speed+PASS_V)*dt;
    /* passando pelo jogador: acerta se ele continuou na faixa */
    if(!B.hitDone&&prev<ST.dist+cop.hz&&B.d>=ST.dist-cop.hz){
      if(Math.abs(ST.px-B.x)<1.7&&ST.carY<1.2){B.hitDone=true;damage('A polícia te acertou!');}
    }
    if(B.d>=ST.dist+cop.hz+2){warn.visible=false;laneUI(false);}
    if(B.d>=ST.dist+LEAD){B.phase='chase';B.t=0;B.laneT=2+Math.random();B.dropT=1.2;B.tx=B.x;}
  }else if(B.phase==='chase'){
    sirenLevel(0.7);
    /* fica à frente, visível, trocando de faixa e jogando espinhos */
    B.d=ST.dist+LEAD+Math.sin(now*0.0012)*6;
    B.laneT-=dt;B.dropT-=dt;
    if(B.laneT<=0){
      const opts=[0,1,2].filter(l=>l!==B.lane);B.lane=opts[(Math.random()*opts.length)|0];B.tx=LANES[B.lane];
      B.laneT=2.4+Math.random()*1.6;B.dropT=Math.max(B.dropT,0.9);
    }
    B.x+=(B.tx-B.x)*(1-Math.exp(-dt*3.2));
    B.spin=-(B.tx-B.x)*0.05;
    if(B.dropT<=0&&Math.abs(B.tx-B.x)<0.3){
      spawn('spike',B.d-cop.hz-1.2,B.x,0);blip(220,140,0.12,'square',0.05);
      B.dropT=1.1+Math.random()*1.0;
    }
    if(ST.dist>=b.at+b.len){
      /* perde o controle: derrapa para fora da pista, capota e explode */
      B.phase='crash';B.t=0;B.vx=(B.x>=0?1:-1)*9;B.vy=4;toast('A polícia perdeu o controle!','');noise(0.5,0.2,900);
    }
  }else if(B.phase==='crash'){
    B.d=ST.dist+LEAD;B.x+=B.vx*dt;B.spin+=dt*7*Math.sign(B.vx);
    B.y=Math.max(0,B.y+B.vy*dt);B.vy-=14*dt;
    sirenLevel(Math.max(0,0.7-B.t));
    if(B.t>1.0||Math.abs(B.x)>11){
      explode(B.x,0.8,-B.d);noise(1.2,0.6,500);blip(120,30,0.8,'sawtooth',0.15);
      cop.g.visible=false;B.phase='idle';el.box.hidden=true;sirenLevel(0);   /* pronto para o próximo chefe da lista */
      ST.coins+=b.reward;toast('Polícia fora!','+'+b.reward+' moedas');
      return;
    }
  }
  place();
}
