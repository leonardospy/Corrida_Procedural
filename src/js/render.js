/* Mundo, câmera e redimensionamento */
import {ST} from './shared.js';
import {$,game} from './dom.js';
import {AHEAD,L,LANES,MAXC,SHOW_Z,V0,cfg,clamp,diff,lerp,smooth} from './config.js';
import {M,PAL,bendU,camera,headPool,hemi,renderer,scene,skyGroup,skyU,spot,starMat,stars,studio,sunL,sunMat,sunMesh,updateLights,vestMats} from './scene.js';
import {C,boardMats,cloudPivot} from './scenery.js';
import {I,flushInstances,hasLamp,placeTile,setI,updateWalkers} from './track.js';
import {coverAt,roadY,underNear} from './tunnels.js';
import {show} from './showroom.js';
import {blob,car,dizzy} from './player.js';
import {coinList,fuelList,obstacles,wrenchList} from './state.js';
import {animCar,updateDebris,updateDust,updateSmoke} from './effects.js';

/* ------------------------------------------------------------------ */
/* Mundo e câmera                                                      */
/* ------------------------------------------------------------------ */
let camH=4.4,camD=9.2,baseFov=62,fovCur=62;
ST.camX=0;ST.camY=3;ST.camO=8;ST.lkX=0;ST.lkY=1;ST.lkO=-2;ST.vox=0;ST.voy=0;
export function updateWorld(dt,now){
  ST.walkT+=dt;bendU.uWalkT.value=ST.walkT;
  const iMax=Math.ceil((ST.dist+AHEAD)/L);
  while(ST.lastTile<iMax){ST.lastTile++;placeTile(ST.lastTile);}

  const p=ST.dist/ST.STAGE_M, pi=Math.floor(p), k=smooth(0.5,1,p-pi);
  const a=PAL[pi%PAL.length], b=PAL[(pi+1)%PAL.length];
  const mix=(target,key)=>target.copy(a[key]).lerp(b[key],k);
  mix(skyU.top.value,'top');mix(skyU.bot.value,'hor');mix(scene.fog.color,'hor');
  mix(M.ground.color,'ground');mix(M.foliage.color,'tree');mix(M.mount.color,'mount');mix(M.asphalt.color,'road');
  mix(hemi.color,'hemiS');mix(hemi.groundColor,'hemiG');mix(sunL.color,'dir');mix(sunMat.color,'sun');
  sunL.intensity=lerp(a.dirI,b.dirI,k)*(1-0.85*ST.menuK);
  hemi.intensity=lerp(a.hemiI,b.hemiI,k)*(1-0.62*ST.menuK);
  const starV=lerp(a.star,b.star,k);
  starMat.opacity=starV;
  const night=clamp(starV*1.7,0,1);
  hemi.intensity*=lerp(1,cfg.nightAmb,night);sunL.intensity*=lerp(1,cfg.nightAmb,night);
  /* dentro de túnel ou da passagem coberta: menos luz do céu, faróis acesos */
  const cov=ST.state==='menu'?0:coverAt(ST.dist);
  hemi.intensity*=lerp(1,0.42,cov);sunL.intensity*=lerp(1,0.12,cov);
  const dark=Math.max(night,cov);
  if(ST.menuK>0){
    skyU.top.value.lerp(studio.top,ST.menuK);skyU.bot.value.lerp(studio.bot,ST.menuK);scene.fog.color.lerp(studio.bot,ST.menuK);
  }
  spot.intensity=2.3*ST.menuK;show.visible=ST.menuK>0.01;
  const inMenu=ST.menuK>0.5;
  for(const key in I)I[key].visible=!inMenu;
  sunMesh.visible=!inMenu;stars.visible=!inMenu;blob.visible=!inMenu;cloudPivot.visible=!inMenu;

  /* cores que dependem da hora do dia */
  M.foliage2.color.copy(M.foliage.color).lerp(C.foB,0.28).lerp(C.white,0.5);
  M.bush.color.copy(M.foliage.color).multiplyScalar(1.08);
  M.dust.color.copy(M.ground.color).lerp(C.dustB,0.55);
  M.hill.color.copy(M.mount.color).lerp(M.ground.color,0.35);
  M.win.color.copy(C.winD).lerp(C.winN,night);
  M.lhead.color.copy(C.lhD).lerp(C.lhN,night);
  M.pool.opacity=0.34*night*(1-ST.menuK);
  const bm=1-0.5*night;boardMats.forEach(function(m){m.color.setScalar(bm);});
  cloudPivot.rotation.y+=dt*0.004;

  const amp=0.55+0.45*diff(ST.dist), live=1-ST.menuK;
  bendU.uBend.value.set(
    live*cfg.curv*amp*0.0034*(0.65*Math.sin(ST.dist*0.0017+0.3)+0.45*Math.sin(ST.dist*0.0043+1.9)),
    live*(0.00012+cfg.curv*amp*0.0008*(0.7*Math.sin(ST.dist*0.0024+0.8)+0.3*Math.sin(ST.dist*0.0061+2.2)-0.35))
  );
  /* passagens subterrâneas à vista: o shader rebaixa a pista nelas */
  const ups=live>0.5?underNear(ST.dist-80,ST.dist+AHEAD+60):[];
  bendU.uDip.value.forEach(function(v,k){const u=ups[k];if(u)v.set(u.ds,u.de,u.depth,u.ramp);else v.set(0,0,0,0);});

  let n=0;
  for(let i=0;i<coinList.length&&n<MAXC;i++){
    const c=coinList[i];
    if(c.d>ST.dist+AHEAD)continue;
    setI(I.coin,n++,LANES[c.lane],(c.y||1.05)+Math.sin(now*0.004+c.d)*0.08,-c.d,1,1,1,now*0.004+c.d);
  }
  I.coin.count=n;I.coin.instanceMatrix.needsUpdate=true;
  let wn=0;
  for(let i=0;i<wrenchList.length&&wn<8;i++){
    const w=wrenchList[i];if(w.d>ST.dist+AHEAD)continue;
    setI(I.wrench,wn++,LANES[w.lane],1.4+Math.sin(now*0.004+w.d)*0.1,-w.d,0.85,0.85,0.85,now*0.003);
  }
  I.wrench.count=wn;I.wrench.instanceMatrix.needsUpdate=true;
  let fn=0;
  for(let i=0;i<fuelList.length&&fn<8;i++){
    const f=fuelList[i];if(f.d>ST.dist+AHEAD)continue;
    setI(I.fuel,fn++,LANES[f.lane],1.1+Math.sin(now*0.004+f.d)*0.1,-f.d,1,1,1,now*0.0025+f.d);
  }
  I.fuel.count=fn;I.fuel.instanceMatrix.needsUpdate=true;
  flushInstances();
  if(!inMenu)updateWalkers();
  updateDebris(dt);updateSmoke(dt);updateDust(dt);

  if(ST.state==='menu'){
    ST.spin+=dt*0.5;
    car.position.set(0,0.4,SHOW_Z);car.rotation.set(0,ST.spin,0);car.visible=true;dizzy.visible=false;
  }else{
    const lean=(LANES[ST.lane]-ST.px);
    const wob=(ST.confuse>0&&ST.state==='play')?Math.sin(now*0.012)*0.16:0;
    car.position.set(ST.px,ST.carY+(ST.state==='play'?Math.sin(now*0.05)*0.01*(ST.speed/ST.cur.vmax):0),-ST.dist);
    if(ST.state==='crash'||ST.state==='over')car.rotation.set(ST.carRx,0,ST.carRz);
    else car.rotation.set(ST.carPitch,-lean*0.05+wob,lean*0.05);
    car.visible=ST.inv<=0||Math.floor(now/70)%2===0||ST.state!=='play';
    blob.position.set(ST.px,0.03,-ST.dist);
    const dz=(ST.confuse>0&&(ST.state==='play'||ST.state==='crash'));
    dizzy.visible=dz;
    if(dz){const ry=roadY(ST.dist);dizzy.children.forEach(function(s,i){const ang=now*0.006+i*2.094;s.position.set(ST.px+Math.cos(ang)*0.9,ry+ST.carY+2.2+Math.sin(ang*2)*0.1,-ST.dist+Math.sin(ang)*0.9);s.rotation.y=ang*2;});}
  }
  animCar(dt);

  /* faróis e lanternas: acendem no fim da tarde e à noite */
  const lightK=ST.state==='menu'?0.9:dark, beamK=ST.state==='menu'?0:dark;
  const on=(ST.state==='play'||ST.state==='crash')?1:0;
  M.lights.color.setScalar(0.55+0.45*lightK);
  M.halo.opacity=0.9*dark;M.halo.visible=dark>0.05;
  M.vest.visible=night>0.12;vestMats.forEach(function(m){m.visible=night>0.12;});
  M.rays.opacity=0.4+0.55*night;
  M.beam2.visible=false;
  M.pool2.visible=false;
  updateLights(now,night,beamK,on,hasLamp,roadY);
  headPool.position.set(ST.px,0.045,-ST.dist-15);
  obstacles.forEach(function(o){const bc=o.mesh.userData.bc;if(bc)bc.rotation.y=now*0.012+o.d*0.7;});

  skyGroup.position.copy(camera.position);
}
export function camTargets(){
  const W=game.clientWidth||1,H=game.clientHeight||1,port=W<=H;
  if(ST.state==='menu'){
    if(port){
      /* mede o menu e o rótulo: o carro cabe inteiro no espaço que sobra */
      const gr=game.getBoundingClientRect(), Hh=gr.height||H, Ww=gr.width||W;
      const mc=$('mcol').getBoundingClientRect(), sh=$('show');
      const y0=clamp(mc.bottom-gr.top+8,0,Hh*0.8);
      const y1=(sh&&!sh.hidden)?sh.getBoundingClientRect().top-gr.top-8:Hh-12;
      const hR=Math.max(60,y1-y0), yc=y0+hR/2;
      const ppm=Math.max(8,Math.min(0.86*Ww/4.9,0.88*hR/2.7));
      const th=Math.tan(baseFov*Math.PI/360);
      const D=clamp(Hh/(2*th*ppm),4,60);
      return{tx:Math.sin(performance.now()*0.0004)*0.5,ty:0.95+D*0.28,to:D*0.96,lx:0,ly:0.95,lo:0,tox:0,toy:Hh/2-yc};
    }
    return{tx:Math.sin(performance.now()*0.0004)*0.8,ty:2.4,to:7.4,lx:0,ly:0.95,lo:0,tox:-0.19*W,toy:0};
  }
  return{tx:ST.px*0.7,ty:camH*cfg.cam,to:camD*cfg.cam,lx:ST.px*0.35,ly:1.2,lo:-18,tox:0,toy:0};
}
export function updateCamera(dt,now){
  const kk=1-Math.exp(-dt*6);
  const c=camTargets();
  ST.camX+=(c.tx-ST.camX)*kk;ST.camY+=(c.ty-ST.camY)*kk;ST.camO+=(c.to-ST.camO)*kk;
  ST.lkX+=(c.lx-ST.lkX)*kk;ST.lkY+=(c.ly-ST.lkY)*kk;ST.lkO+=(c.lo-ST.lkO)*kk;
  ST.vox+=(c.tox-ST.vox)*kk;ST.voy+=(c.toy-ST.voy)*kk;
  const menu=ST.state==='menu', baseZ=menu?SHOW_Z:-ST.dist;
  const sh=ST.shake*0.5;
  /* acompanha a pista na passagem subterrânea e não atravessa o teto de túneis e lajes */
  const ry=menu?0:roadY(ST.dist), cov=menu?0:coverAt(ST.dist);
  let cy=ST.camY+ry;
  if(cov>0.01)cy=Math.min(cy,ry<-3?-1.0:7.2);
  camera.position.set(ST.camX+(Math.random()-0.5)*sh,cy+(Math.random()-0.5)*sh,baseZ+ST.camO);
  camera.lookAt(ST.lkX,ST.lkY+(menu?0:roadY(ST.dist-ST.lkO)),baseZ+ST.lkO);
  const sf=clamp((ST.speed-V0)/(ST.cur.vmax-V0),0,1);
  const tf=baseFov+((ST.state==='play'||ST.state==='crash')?10*sf:0);
  fovCur+=(tf-fovCur)*kk;
  const W=game.clientWidth||1,H=game.clientHeight||1;
  if(Math.abs(camera.fov-fovCur)>0.01)camera.fov=fovCur;
  if(Math.abs(ST.vox)>0.5||Math.abs(ST.voy)>0.5)camera.setViewOffset(W,H,ST.vox,ST.voy,W,H);
  else if(camera.view&&camera.view.enabled)camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
let rW=0,rH=0;
export function resize(){
  const w=Math.max(1,game.clientWidth),h=Math.max(1,game.clientHeight);
  if(w!==rW||h!==rH||ST.appliedRes!==cfg.res){
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,cfg.res));ST.appliedRes=cfg.res;
    renderer.setSize(w,h,false);rW=w;rH=h;
  }
  $('mcol').style.maxHeight=(w<=h)?Math.round(h*0.62)+'px':'';
  camera.aspect=w/h;
  const a=camera.aspect, portrait=clamp((1.25-a)/0.8,0,1);
  camH=lerp(4.4,5.0,portrait);camD=lerp(9.2,10.4,portrait);
  baseFov=clamp(clamp(2*Math.atan(0.62/a)*180/Math.PI,60,98)+cfg.fov,40,110);
  camera.fov=fovCur=baseFov;camera.updateProjectionMatrix();
}
if(window.ResizeObserver)new ResizeObserver(resize).observe(game);
window.addEventListener('resize',resize);
