/* Áudio sintetizado (WebAudio) */
import {ST} from './shared.js';
import {L,cfg} from './config.js';
import {cityK,desertAt} from './track.js';
import {coverAt} from './tunnels.js';

export let AC=null,master=null,engOsc=null,engGain=null,engF=null;ST.muted=false;
let echoWet=null,amb=null,siren=null;
try{ST.muted=localStorage.getItem('corrida-procedural-mute')==='1';}catch(e){}
export function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=ST.muted?0:0.7*cfg.vol/100;master.connect(AC.destination);
    engOsc=AC.createOscillator();engOsc.type='sawtooth';
    engF=AC.createBiquadFilter();engF.type='lowpass';engF.frequency.value=420;
    engGain=AC.createGain();engGain.gain.value=0;
    engOsc.connect(engF);engF.connect(engGain);engGain.connect(master);engOsc.start();
    /* eco do motor dentro de túneis */
    const echo=AC.createDelay(0.5),fb=AC.createGain();echoWet=AC.createGain();
    echo.delayTime.value=0.11;fb.gain.value=0.38;echoWet.gain.value=0;
    engGain.connect(echo);echo.connect(fb);fb.connect(echo);echo.connect(echoWet);echoWet.connect(master);
    ambInit();
  }catch(e){AC=null;}
}

/* ---------- Som ambiente: trânsito e burburinho na cidade, vento e passarinhos na mata ---------- */
function noiseBuf(brown){
  const n=AC.sampleRate*2,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);
  let l=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;if(brown){l=(l+0.02*w)/1.02;a[i]=l*3.5;}else a[i]=w;}
  return b;
}
function loopThrough(buf,type,freq,q,vol,out){
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=buf;s.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.value=vol;
  s.connect(f);f.connect(g);g.connect(out);s.start();
  return g;
}
function ambInit(){
  const bus=AC.createGain(),city=AC.createGain(),forest=AC.createGain();
  city.gain.value=0;forest.gain.value=0;
  bus.connect(master);city.connect(bus);forest.connect(bus);
  const wb=noiseBuf(false),bb=noiseBuf(true);
  loopThrough(bb,'lowpass',380,0.7,0.5,city);      /* ronco do trânsito */
  loopThrough(wb,'bandpass',1100,0.6,0.08,city);   /* burburinho */
  const wind=loopThrough(wb,'bandpass',520,0.8,0.22,forest);
  const lfo=AC.createOscillator(),depth=AC.createGain();   /* rajadas de vento */
  lfo.frequency.value=0.11;depth.gain.value=0.14;lfo.connect(depth);depth.connect(wind.gain);lfo.start();
  amb={bus:bus,city:city,forest:forest,nextBird:0,nextHorn:0};
  /* sirene da polícia: onda triangular subindo e descendo (uivo), volume controlado por sirenLevel */
  const so=AC.createOscillator(),sg=AC.createGain(),lf=AC.createOscillator(),ld=AC.createGain();
  so.type='triangle';so.frequency.value=900;lf.frequency.value=0.55;ld.gain.value=320;lf.connect(ld);ld.connect(so.frequency);
  sg.gain.value=0;so.connect(sg);sg.connect(master);so.start();lf.start();siren=sg;
}
function panned(vol){
  const g=AC.createGain();g.gain.value=vol;
  if(AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=Math.random()*1.6-0.8;g.connect(p);p.connect(amb.bus);}
  else g.connect(amb.bus);
  return g;
}
function chirp(t0,vol){
  const out=panned(vol),n=2+((Math.random()*3)|0),f=2200+Math.random()*2200;
  for(let k=0;k<n;k++){
    const o=AC.createOscillator(),g=AC.createGain(),t=t0+k*(0.09+Math.random()*0.05),d=0.06+Math.random()*0.05;
    o.type='sine';o.frequency.setValueAtTime(f*(1+Math.random()*0.2),t);o.frequency.exponentialRampToValueAtTime(f*(0.7+Math.random()*0.7),t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(1,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+d+0.02);
  }
}
function horn(t0,vol){
  const out=panned(vol),f=Math.random()<0.5?330:415,f2=f*1.26,lp=AC.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=1500;lp.connect(out);
  const beeps=Math.random()<0.4?2:1;
  for(let b=0;b<beeps;b++){
    const t=t0+b*0.32,d=b?0.22:0.18+Math.random()*0.3,g=AC.createGain();
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(1,t+0.02);g.gain.setValueAtTime(1,t+d);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.05);
    g.connect(lp);
    [f,f2].forEach(function(fr){const o=AC.createOscillator();o.type='square';o.frequency.value=fr;o.connect(g);o.start(t);o.stop(t+d+0.08);});
  }
}

export function audioTick(){
  if(!AC)return;
  const on=(ST.state==='play'||ST.state==='crash'),t=AC.currentTime;
  musicTick(on);
  engGain.gain.setTargetAtTime(on&&ST.fuel>0?0.024:0,t,0.08);   /* motor mais baixo */
  engOsc.frequency.setTargetAtTime(52+ST.speed*2.3,t,0.08);
  engF.frequency.setTargetAtTime(300+ST.speed*14,t,0.1);
  /* ambiente: mistura cidade/mata pelo trecho atual; abafado dentro de túneis, onde o motor ecoa */
  const kc=cityK(Math.round(ST.dist/L)), cov=on?coverAt(ST.dist):0, open=on?1-0.8*cov:0;
  echoWet.gain.setTargetAtTime(0.6*cov,t,0.2);
  amb.city.gain.setTargetAtTime(0.28*kc*open,t,0.6);
  amb.forest.gain.setTargetAtTime(0.3*(1-kc)*open,t,0.6);
  if(!on||ST.muted)return;
  const kd=desertAt(ST.dist);   /* no deserto só o vento: sem passarinhos */
  if(t>=amb.nextBird){if((1-kc)*(1-kd)*open>0.2)chirp(t+0.02,0.035*(1-kc)*(1-kd)*open);amb.nextBird=t+0.35+Math.random()*2.2;}
  if(t>=amb.nextHorn){if(kc*open>0.3)horn(t+0.02,0.03*kc*open);amb.nextHorn=t+3+Math.random()*7;}
}
export function blip(f1,f2,dur,type,vol){
  if(!AC||ST.muted)return;
  const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.02);
}
export function noise(dur,vol,fc){
  if(!AC||ST.muted)return;
  const n=Math.floor(AC.sampleRate*dur),buf=AC.createBuffer(1,n,AC.sampleRate),a=buf.getChannelData(0);
  for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=buf;f.type='lowpass';f.frequency.value=fc;g.gain.value=vol;
  s.connect(f);f.connect(g);g.connect(master);s.start();
}

/* volume da sirene (0 a 1), ajustado a cada quadro pelo chefe */
export function sirenLevel(v){if(AC&&siren)siren.gain.setTargetAtTime(ST.muted?0:0.018*v,AC.currentTime,0.1);}

/* ---------- Música de ação (chefe): bateria, baixo e arpejo sintetizados, 150 bpm, lá menor ---------- */
const BPM=150, STEP=60/BPM/4;
/* acordes de 1 compasso cada: Am - F - C - G (notas MIDI) */
const CHORDS=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
const BASS=[0,0,-1,0, 0,-1,0,12, 0,0,-1,0, 7,-1,12,0];   /* posição na escala do acorde (−1 = pausa) */
const ARP=[0,1,2,1, 2,3,2,1, 0,1,2,3, 2,1,2,0];
let music=null;
const mtof=m=>440*Math.pow(2,(m-69)/12);
function musicInit(){
  const g=AC.createGain();g.gain.value=0;g.connect(master);
  const dl=AC.createDelay(0.5),fb=AC.createGain(),wet=AC.createGain();dl.delayTime.value=STEP*3;fb.gain.value=0.3;wet.gain.value=0.25;
  dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(g);
  music={g:g,dl:dl,on:false,step:0,next:0};
}
function env(node,t,peak,dur){node.gain.setValueAtTime(0.0001,t);node.gain.exponentialRampToValueAtTime(peak,t+0.005);node.gain.exponentialRampToValueAtTime(0.0001,t+dur);}
let noiseBufM=null;
function hit(t,dur,vol,type,freq){
  if(!noiseBufM){const n=AC.sampleRate*0.3;noiseBufM=AC.createBuffer(1,n,AC.sampleRate);const a=noiseBufM.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;}
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBufM;f.type=type;f.frequency.value=freq;env(g,t,vol,dur);s.connect(f);f.connect(g);g.connect(music.g);s.start(t);s.stop(t+dur+0.02);
}
function tone(t,freq,dur,vol,type,out,lp){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);env(g,t,vol,dur);
  if(lp){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;o.connect(f);f.connect(g);}else o.connect(g);
  g.connect(out||music.g);o.start(t);o.stop(t+dur+0.02);
}
function scheduleStep(i,t){
  const bar=Math.floor(i/16)%4,s=i%16,ch=CHORDS[bar];
  /* bateria: bumbo nos tempos (e um extra no fim), caixa no 2 e no 4, chimbal em colcheias */
  if(s%4===0||s===14){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+0.12);env(g,t,0.9,0.16);o.connect(g);g.connect(music.g);o.start(t);o.stop(t+0.2);}
  if(s===4||s===12){hit(t,0.13,0.5,'highpass',1600);tone(t,190,0.08,0.25,'triangle');}
  if(s%2===0)hit(t,0.035,s%4===2?0.22:0.12,'highpass',7000);
  /* baixo serrilhado e arpejo quadrado com eco */
  const b=BASS[s];if(b>=0)tone(t,mtof(ch[0]-12+b),STEP*0.9,0.35,'sawtooth',null,700);
  const n=ARP[s],note=ch[n%3]+12+(n===3?12:0);
  tone(t,mtof(note),STEP*0.8,0.11,'square',null,2600);tone(t,mtof(note),STEP*0.8,0.06,'square',music.dl,2600);
}
/* liga ou desliga a música (com fade); chamado pelo chefe */
export function musicOn(on){
  if(!AC)return;
  if(!music)musicInit();
  if(on&&!music.on){music.on=true;music.step=0;music.next=AC.currentTime+0.08;}
  if(!on)music.on=false;
}
/* agenda as próximas notas um pouco à frente do relógio do áudio; abafa na pausa */
export function musicTick(playing){
  if(!AC||!music)return;
  const t=AC.currentTime,target=music.on&&playing&&!ST.muted?0.22*cfg.vol/100:0;
  music.g.gain.setTargetAtTime(target,t,music.on?0.4:0.8);
  if(!music.on)return;
  while(music.next<t+0.15){scheduleStep(music.step,music.next);music.step++;music.next+=STEP;}
}
