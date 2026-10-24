/* Efeitos: destroços, fumaça, poeira e rodas */
import {ST} from './shared.js';
import {LANES,NDEB,NDUST,NSM,clamp} from './config.js';
import {M} from './scene.js';
import {I,dummy,hideI,setI} from './track.js';
import {car} from './player.js';

/* ------------------------------------------------------------------ */
/* Efeitos e áudio                                                     */
/* ------------------------------------------------------------------ */
export const debris=[];
for(let i=0;i<NDEB;i++)debris.push({p:new THREE.Vector3(),v:new THREE.Vector3(),r:new THREE.Vector3(),life:0});
export function spawnDebris(frac){
  debris.forEach((d,i)=>{
    if(i/NDEB>=frac)return;
    d.p.set(ST.px,0.8,-ST.dist);
    d.v.set((Math.random()-0.5)*10,3+Math.random()*8,-ST.speed*0.4+(Math.random()-0.5)*8);
    d.r.set(Math.random()*6,Math.random()*6,Math.random()*6);
    d.life=1.1+Math.random()*0.8;
  });
}
const eul=new THREE.Euler();
export function updateDebris(dt){
  debris.forEach((d,i)=>{
    if(d.life>0){
      d.life-=dt;d.v.y-=24*dt;d.p.addScaledVector(d.v,dt);
      if(d.p.y<0.16){d.p.y=0.16;d.v.y*=-0.35;d.v.x*=0.8;d.v.z*=0.8;}
      eul.set(d.r.x*d.life,d.r.y*d.life,d.r.z*d.life);
      const s=Math.min(1,Math.max(0,d.life*2.2));
      dummy.position.copy(d.p);dummy.rotation.copy(eul);dummy.scale.set(s,s,s);
    }else{dummy.position.set(0,-50,0);dummy.scale.set(0,0,0);}
    dummy.updateMatrix();I.deb.setMatrixAt(i,dummy.matrix);
  });
  I.deb.instanceMatrix.needsUpdate=true;
}
export const smokeP=[];
for(let i=0;i<NSM;i++)smokeP.push({p:new THREE.Vector3(),v:new THREE.Vector3(),life:0,max:1});
export function emitSmoke(dt){
  if(ST.hits<1)return;
  ST.smokeAcc+=dt*(ST.hits>=2?28:11);
  while(ST.smokeAcc>=1){
    ST.smokeAcc-=1;
    const s=smokeP.find(q=>q.life<=0);if(!s)break;
    s.p.set(ST.px+(Math.random()-0.5)*0.8,0.95,-ST.dist-1.3);
    s.v.set((Math.random()-0.5)*0.8,1.6+Math.random()*1.4,0);
    s.max=s.life=0.9+Math.random()*0.6;
  }
}
export function updateSmoke(dt){
  M.smoke.color.setHex(ST.hits>=2?0x24262d:0x8a8f99);
  smokeP.forEach((s,i)=>{
    if(s.life>0){
      s.life-=dt;s.p.addScaledVector(s.v,dt);
      const k=1-s.life/s.max, sc=(0.3+k*1.0)*Math.min(1,s.life/s.max*3);
      setI(I.smoke,i,s.p.x,s.p.y,s.p.z,sc,sc,sc,k*3);
    }else hideI(I.smoke,i);
  });
  I.smoke.instanceMatrix.needsUpdate=true;
}

/* Poeira levantada pelas rodas ao trocar de faixa */
export const dust=[];
for(let i=0;i<NDUST;i++)dust.push({p:new THREE.Vector3(),v:new THREE.Vector3(),life:0,max:1,s:1});
let dustAcc=0;
export function emitDust(dt){
  const lat=LANES[ST.lane]-ST.px;
  if(Math.abs(lat)<0.3||ST.speed<8||ST.airborne||ST.carY>0.1||!car||!car.userData.wx)return;
  const u=car.userData, dir=Math.sign(lat);
  dustAcc+=dt*70*Math.min(1,Math.abs(lat)/1.6);
  while(dustAcc>=1){
    dustAcc-=1;
    const d=dust.find(function(q){return q.life<=0;});if(!d)break;
    const sx=Math.random()<0.5?-1:1, sz=Math.random()<0.7?1:-1;
    d.p.set(ST.px+sx*u.wx,0.12,-ST.dist+sz*u.wz+(Math.random()-0.5)*0.4);
    d.v.set(-dir*(1.2+Math.random()*2.2)+(Math.random()-0.5)*0.8,0.8+Math.random()*1.6,-ST.speed*0.22*(0.4+Math.random()));
    d.max=d.life=0.7+Math.random()*0.7;d.s=0.7+Math.random()*0.7;
  }
}
export function updateDust(dt){
  dust.forEach(function(d,i){
    if(d.life>0){
      d.life-=dt;d.v.y-=2.2*dt;d.v.x*=Math.exp(-dt*1.6);d.p.addScaledVector(d.v,dt);
      if(d.p.y<0.1)d.p.y=0.1;
      const k=1-d.life/d.max, env=Math.min(1,Math.min(1,k*8)*(1-k)*1.6);
      const sc=d.s*(0.25+k*0.95)*Math.max(0.04,env);
      setI(I.dust,i,d.p.x,d.p.y,d.p.z,sc,sc*0.8,sc,k*4);
    }else hideI(I.dust,i);
  });
  I.dust.instanceMatrix.needsUpdate=true;
}
/* Rodas giram com a velocidade; as da frente esterçam na troca de faixa */
export function animCar(dt){
  const u=car.userData;if(!u||!u.wheels)return;
  const sp=ST.state==='menu'?5:ST.speed;
  const lean=ST.state==='menu'?0:(LANES[ST.lane]-ST.px);
  const steer=clamp(-lean*0.07,-0.2,0.2);
  u.wheels.forEach(function(w){w.mesh.rotation.x-=sp*dt/u.r;if(w.front)w.piv.rotation.y=steer;});
}
