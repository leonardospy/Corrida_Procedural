/* Ajustes do jogador, parâmetros da pista e funções matemáticas */
import {ST} from './shared.js';

/* Ajustes do jogador (sliders do menu), salvos neste aparelho */
export const CFG_KEY='corrida-procedural-cfg-v1';
const pct=v=>Math.round(v*100)+'%';
export const CFG_UI=[
  {k:'style',t:'Estilo gráfico',min:0,max:1,step:1,def:0,f:v=>v>=0.5?'Desenho':'Realista'},
  {k:'lampI',t:'Luz dos postes',min:0,max:2,step:0.05,def:1,f:pct},
  {k:'lampN',t:'Postes acesos ao mesmo tempo',min:0,max:4,step:1,def:3,f:v=>String(Math.round(v))},
  {k:'headI',t:'Intensidade dos faróis',min:0,max:2,step:0.05,def:1,f:pct},
  {k:'nightAmb',t:'Claridade da noite',min:0.5,max:1.8,step:0.05,def:1,f:pct},
  {k:'stage',t:'Duração de cada período do dia',min:100,max:3000,step:100,def:1000,f:v=>Math.round(v)+' m'},
  {k:'spd',t:'Ganho de velocidade',min:0.3,max:1.6,step:0.05,def:1,f:pct},
  {k:'forest',t:'Densidade da mata',min:0.3,max:1.3,step:0.05,def:1,f:pct},
  {k:'dens',t:'Quantidade de obstáculos',min:0.5,max:1.5,step:0.05,def:1,f:pct},
  {k:'ped',t:'Frequência de pedestres',min:0,max:2,step:0.1,def:1,f:v=>v<0.05?'nenhum':pct(v)},
  {k:'curv',t:'Curvas e morros',min:0,max:1.5,step:0.05,def:1,f:pct},
  {k:'cam',t:'Distância da câmera',min:0.7,max:1.4,step:0.05,def:1,f:pct},
  {k:'fov',t:'Campo de visão',min:-15,max:20,step:1,def:0,f:v=>(v>0?'+':'')+Math.round(v)+'°'},
  {k:'vol',t:'Volume',min:0,max:100,step:5,def:100,f:v=>Math.round(v)+'%'},
  {k:'res',t:'Resolução máxima (desempenho)',min:0.6,max:2,step:0.05,def:1.75,f:v=>v.toFixed(2)+'×'}
];
export const cfg={};
CFG_UI.forEach(u=>{cfg[u.k]=u.def;});
try{
  const r=JSON.parse(localStorage.getItem(CFG_KEY)||'{}');
  CFG_UI.forEach(u=>{const v=r&&r[u.k];if(typeof v==='number'&&isFinite(v))cfg[u.k]=Math.min(u.max,Math.max(u.min,v));});
}catch(e){}


/* ------------------------------------------------------------------ */
/* Parâmetros                                                          */
/* ------------------------------------------------------------------ */
export const LANE_W=3.4, LANES=[-LANE_W,0,LANE_W], ROAD_HALF=5.5;
export const L=12, AHEAD=190, BEHIND_T=3, N=Math.ceil(AHEAD/L)+BEHIND_T+9, TPT=3;
export const V0=24, VW=80;                 // velocidade inicial e assíntota do ritmo da pista (m/s)
export const LEVEL_M=500;
ST.STAGE_M=Math.max(100,cfg.stage);
export const MAXC=80, NDEB=28, NSM=36, NDUST=70;
export const SHOW_Z=600;                   // posição do showroom, longe da pista
export const CONFUSE_T=6;
export const diff=d=>1-Math.exp(-d/2600);
export const speedAt=d=>V0+(VW-V0)*(1-Math.exp(-d*cfg.spd/6500));

export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const hash=(i,k)=>{const x=Math.sin(i*127.1+k*311.7+19.19)*43758.5453;return x-Math.floor(x);};
export const fmt=n=>Math.round(n).toLocaleString('pt-BR');
