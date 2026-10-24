/* Túneis na mata (montanha sobre a pista) e passagens subterrâneas na cidade */
import {L,hash,smooth} from './config.js';
import {cityK,isX,segStart} from './track.js';

/* túneis da mata: cada região de mata (trecho ímpar entre duas cidades) tem 0, 1 ou 2 túneis longos (300 a 700 m) */
const tunC=new Map();
function segOf(d){let k=0;while(segStart(k+1)<=d)k++;return k;}
function tunSeg(k){
  if(tunC.has(k))return tunC.get(k);
  const list=[];
  if(k%2===1){
    const a=segStart(k)+420,b=segStart(k+1)-420, r=hash(k,700), n=r<0.2?0:(r<0.6?1:2);
    for(let t=0;t<n;t++){
      const lo=a+(b-a)*t/n, hi=a+(b-a)*(t+1)/n, len=(25+Math.floor(hash(k,701+t)*34))*L;
      if(hi-lo<len+80)continue;
      const s=Math.floor((lo+40+hash(k,710+t)*(hi-lo-len-80))/L), e=s+Math.round(len/L);
      let ok=true;
      for(let i=s-5;i<=e+5;i++)if(cityK(i)>0.02){ok=false;break;}
      if(ok)list.push({s:s,e:e,ds:s*L-L/2,de:e*L-L/2});
    }
  }
  tunC.set(k,list);return list;
}
export function tunnelOf(i){
  const list=tunSeg(segOf(i*L));
  for(let n=0;n<list.length;n++)if(i>=list[n].s&&i<list[n].e)return list[n];
  return null;
}

/* passagem subterrânea: entre dois cruzamentos (que ficam em i%20===5), rampa de 3 faixas em cada ponta */
const UB=20, UP_DEPTH=6.5, UP_RAMP=3*L, upC=new Map();
function upBlock(b){
  if(upC.has(b))return upC.get(b);
  let r=null;
  if(b>=3&&hash(b,600)<0.4){
    const s=b*UB+8, e=b*UB+23;
    let ok=true;
    for(let i=s-2;i<=e+1;i++)if(cityK(i)<0.95){ok=false;break;}
    for(let i=s;i<e&&ok;i++)if(isX(i))ok=false;
    if(ok)r={s:s,e:e,ds:s*L-L/2,de:e*L-L/2,depth:UP_DEPTH,ramp:UP_RAMP};
  }
  upC.set(b,r);return r;
}
/* o trecho começa na faixa b*20+8 e passa do fim do bloco: o bloco da faixa i é o de i-8 */
export function underOf(i){const u=upBlock(Math.floor((i-8)/UB));return u&&i>=u.s&&i<u.e?u:null;}
const tileAt=d=>Math.floor(d/L+0.5);

/* altura da pista (negativa dentro da passagem subterrânea) */
export function roadY(d){
  const u=underOf(tileAt(d));
  if(!u)return 0;
  return -u.depth*smooth(u.ds,u.ds+u.ramp,d)*(1-smooth(u.de-u.ramp,u.de,d));
}
/* 0 = céu aberto, 1 = dentro de túnel ou do trecho coberto da passagem */
export function coverAt(d){
  const i=tileAt(d);
  const t=tunnelOf(i)||tunnelOf(i-1)||tunnelOf(i+1);
  if(t)return smooth(t.ds-4,t.ds+14,d)*(1-smooth(t.de-14,t.de+4,d));
  const u=underOf(i)||underOf(i-1)||underOf(i+1);
  if(u){const a=u.ds+u.ramp,b=u.de-u.ramp;return smooth(a-6,a+10,d)*(1-smooth(b-10,b+6,d));}
  return 0;
}
/* trecho onde não cabem placas nem obstáculos parados: cruzamentos, túneis e passagens (com folga m) */
export function busyAt(d,m){
  const i0=Math.floor((d-m)/L)-2,i1=Math.ceil((d+m)/L)+2;
  for(let i=i0;i<=i1;i++){
    const c=Math.abs(i*L-d);
    if(isX(i)&&c<m+12)return true;
    if((tunnelOf(i)||underOf(i))&&c<m+L/2)return true;
  }
  return false;
}
/* passagens perto do jogador, para o shader que rebaixa a pista */
export function underNear(d0,d1){
  const out=[];
  for(let b=Math.floor(d0/L/UB)-1;b<=Math.floor(d1/L/UB)+1;b++){
    const u=upBlock(b);
    if(u&&u.de>d0&&u.ds<d1)out.push(u);
  }
  return out;
}
