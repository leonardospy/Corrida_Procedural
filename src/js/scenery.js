/* Placas, outdoors e nuvens */
import {ST} from './shared.js';
import {AHEAD,L,fmt} from './config.js';
import {M,patch,scene,skyGroup} from './scene.js';
import {PB,geo} from './geometry.js';
import {save} from './save.js';
import {busyAt} from './tunnels.js';

/* ------------------------------------------------------------------ */
/* Placas, outdoors e nuvens                                           */
/* ------------------------------------------------------------------ */
export const C={winD:new THREE.Color(0x6f9bc8),winN:new THREE.Color(0xffd27a),lhD:new THREE.Color(0xdfe6ef),lhN:new THREE.Color(0xffeab0),
  foB:new THREE.Color(0xb4dc6a),dustB:new THREE.Color(0xd9c8a4),white:new THREE.Color(0xffffff)};
const FONT='"Chakra Petch","Trebuchet MS",sans-serif';
export const boardMats=[];
function boardMat(tex){const m=patch(new THREE.MeshBasicMaterial({map:tex}));boardMats.push(m);return m;}

/* placa verde de rodovia */
const hwTexts=[['CENTRO','12 km'],['AEROPORTO','8 km'],['PRAIA','26 km'],['SAÍDA 3','Parque'],['PORTO','41 km'],['SERRA','17 km']];
const sgGeo=geo([PB(0.5,7.4,0.5,-6.4,3.7,0,0x7b8290),PB(0.5,7.4,0.5,6.4,3.7,0,0x7b8290),PB(13.6,0.4,0.5,0,7.3,0,0x7b8290)]);
const signGantries=[];
for(let i=0;i<2;i++){
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;
  const tx=new THREE.CanvasTexture(cv);
  const grp=new THREE.Group();
  const board=new THREE.Mesh(new THREE.PlaneGeometry(12.4,3.1),boardMat(tx));board.position.set(0,6.1,0.3);
  grp.add(new THREE.Mesh(sgGeo,M.vcol),board);grp.visible=false;scene.add(grp);
  signGantries.push({grp:grp,cv:cv,tx:tx,d:0,on:false});
}
function drawHw(gt,n){
  const c=gt.cv.getContext('2d');
  const a=hwTexts[n%hwTexts.length], b=hwTexts[(n+2)%hwTexts.length];
  c.fillStyle='#0e6b3b';c.fillRect(0,0,512,128);
  c.strokeStyle='#f4f1ea';c.lineWidth=5;c.strokeRect(6,6,500,116);
  c.fillStyle='#f4f1ea';c.textBaseline='middle';c.textAlign='left';
  c.font='700 34px '+FONT;c.fillText(a[0],28,44);c.fillText(b[0],286,44);
  c.font='500 26px '+FONT;c.fillText(a[1],28,92);c.fillText(b[1],286,92);
  c.fillRect(255,18,3,92);
  gt.tx.needsUpdate=true;
}

/* outdoors */
const bbGeo=geo([PB(0.3,5.6,0.3,-2.5,2.8,0,0x6b7078),PB(0.3,5.6,0.3,2.5,2.8,0,0x6b7078),PB(7.5,4.0,0.22,0,6.9,-0.02,0x2a2d3a)]);
function drawBoard(n,c,w,h){
  c.textBaseline='middle';c.textAlign='left';
  if(n===0){
    c.fillStyle='#8fd0ff';c.fillRect(0,0,w,h);
    c.fillStyle='#ffe28a';c.beginPath();c.arc(w*0.74,h*0.3,h*0.14,0,7);c.fill();
    c.fillStyle='#4c8a5a';c.beginPath();c.moveTo(0,h);c.lineTo(w*0.25,h*0.42);c.lineTo(w*0.46,h*0.74);c.lineTo(w*0.68,h*0.36);c.lineTo(w,h*0.8);c.lineTo(w,h);c.fill();
    c.fillStyle='#ffffff';c.font='700 '+Math.round(h*0.16)+'px '+FONT;c.fillText('VISITE A SERRA',w*0.06,h*0.16);
  }else if(n===1){
    c.fillStyle='#2a1d16';c.fillRect(0,0,w,h);
    c.fillStyle='#ffb347';c.font='700 '+Math.round(h*0.42)+'px '+FONT;c.fillText('CAFÉ',w*0.08,h*0.4);
    c.fillStyle='#fff4e2';c.font='500 '+Math.round(h*0.14)+'px '+FONT;c.fillText('ABERTO 24 HORAS',w*0.08,h*0.76);
  }else if(n===2){
    c.fillStyle='#16324f';c.fillRect(0,0,w,h);
    c.fillStyle='#ffd84a';c.font='700 '+Math.round(h*0.3)+'px '+FONT;c.fillText('HOTEL',w*0.08,h*0.34);
    c.fillStyle='#ffffff';c.font='500 '+Math.round(h*0.14)+'px '+FONT;c.fillText('Próxima saída · 4 km',w*0.08,h*0.7);
    c.fillStyle='#ffd84a';for(let i=0;i<5;i++){c.fillRect(w*0.08+i*w*0.07,h*0.84,w*0.045,h*0.05);}
  }else{
    c.fillStyle='#f2b705';c.fillRect(0,0,w,h);
    c.fillStyle='#16161b';c.font='700 '+Math.round(h*0.28)+'px '+FONT;c.fillText('PNEUS & CIA',w*0.07,h*0.36);
    c.font='500 '+Math.round(h*0.14)+'px '+FONT;c.fillText('Troca rápida na estrada',w*0.07,h*0.72);
  }
}
const boards=[];
for(let i=0;i<4;i++){
  const cv=document.createElement('canvas');cv.width=512;cv.height=256;drawBoard(i,cv.getContext('2d'),512,256);
  const tx=new THREE.CanvasTexture(cv);
  const grp=new THREE.Group();
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(7.1,3.6),boardMat(tx));pl.position.set(0,6.9,0.12);
  grp.add(new THREE.Mesh(bbGeo,M.vcol),pl);grp.visible=false;scene.add(grp);
  boards.push({grp:grp,d:0,on:false});
}
/* placa do recorde: pórtico quadriculado na maior distância já alcançada */
const recCv=document.createElement('canvas');recCv.width=512;recCv.height=128;
const recTx=new THREE.CanvasTexture(recCv);
const recGrp=new THREE.Group();
{
  const board=new THREE.Mesh(new THREE.PlaneGeometry(12.4,3.1),boardMat(recTx));board.position.set(0,6.1,0.3);
  recGrp.add(new THREE.Mesh(sgGeo,M.vcol),board);recGrp.visible=false;scene.add(recGrp);
}
function drawRecord(d){
  const c=recCv.getContext('2d'),q=16;
  for(let y=0;y<2;y++)for(let x=0;x<512/q;x++){c.fillStyle=(x+y)%2?'#16161b':'#f4f1ea';c.fillRect(x*q,y*q,q,q);c.fillRect(x*q,128-(2-y)*q,q,q);}
  c.fillStyle='#120d1f';c.fillRect(0,2*q,512,128-4*q);
  c.textBaseline='middle';c.textAlign='center';
  c.fillStyle='#ffc24a';c.font='700 30px '+FONT;c.fillText('SEU RECORDE',256,50);
  c.fillStyle='#fff4e2';c.font='700 26px '+FONT;c.fillText(fmt(d)+' m',256,82);
  recTx.needsUpdate=true;
}
const props={sgNext:300,bbNext:180,recD:0,recAt:-1e9,recOn:false};
/* primeiro ponto a partir de d sem cruzamento, túnel, passagem subterrânea nem a placa do recorde */
const freeFrom=(d,m)=>{for(let k=0;k<40&&(busyAt(d,m)||Math.abs(d-props.recAt)<40);k++)d+=L;return d;};
/* pula as placas para a distância d (início direto no chefe) */
export function skipProps(d){props.sgNext=d+150;props.bbNext=d+90;props.recOn=props.recAt<d;}
export function resetProps(){
  props.sgNext=300;props.bbNext=180;
  props.recAt=-1e9;props.recD=save.bestD||0;props.recAt=props.recD>=100?freeFrom(props.recD,8):-1e9;
  props.recOn=false;recGrp.visible=false;
  signGantries.forEach(function(g){g.on=false;g.grp.visible=false;});
  boards.forEach(function(b){b.on=false;b.grp.visible=false;});
}
export function updateProps(){
  if(!props.recOn&&props.recD>=100&&props.recAt<ST.dist+AHEAD){
    props.recOn=true;
    drawRecord(props.recD);recGrp.position.set(0,0,-props.recAt);recGrp.visible=true;
  }
  if(recGrp.visible&&-recGrp.position.z<ST.dist-40)recGrp.visible=false;
  while(props.sgNext<ST.dist+AHEAD){
    const g=signGantries.find(function(x){return !x.on;});
    props.sgNext=freeFrom(props.sgNext,8);
    if(g){g.on=true;g.d=props.sgNext;g.grp.position.set(0,0,-g.d);g.grp.visible=true;drawHw(g,(Math.random()*6)|0);}
    props.sgNext+=420+Math.random()*260;
  }
  while(props.bbNext<ST.dist+AHEAD){
    const b=boards.find(function(x){return !x.on;});
    props.bbNext=freeFrom(props.bbNext,10);
    if(b){const side=Math.random()<0.5?-1:1;b.on=true;b.d=props.bbNext;b.grp.position.set(side*(11+Math.random()*4),0,-b.d);b.grp.rotation.y=-side*0.42;b.grp.visible=true;}
    props.bbNext+=230+Math.random()*220;
  }
  signGantries.forEach(function(g){if(g.on&&g.d<ST.dist-40){g.on=false;g.grp.visible=false;}});
  boards.forEach(function(b){if(b.on&&b.d<ST.dist-40){b.on=false;b.grp.visible=false;}});
}

/* nuvens: giram devagar em volta da câmera */
export const cloudPivot=new THREE.Group();skyGroup.add(cloudPivot);
const cloudG=new THREE.IcosahedronGeometry(1,0);
for(let i=0;i<14;i++){
  const g=new THREE.Group(), n=3+((Math.random()*3)|0);
  for(let k=0;k<n;k++){
    const m=new THREE.Mesh(cloudG,M.cloud);
    m.position.set((k-n/2)*7+Math.random()*3,Math.random()*2.5,(Math.random()-0.5)*5);
    const s=6+Math.random()*5;m.scale.set(s*1.3,s*0.62,s);g.add(m);
  }
  const a=Math.random()*Math.PI*2, r=300+Math.random()*60, h=70+Math.random()*90;
  g.position.set(Math.cos(a)*r,h,Math.sin(a)*r);g.lookAt(0,h,0);
  cloudPivot.add(g);
}
