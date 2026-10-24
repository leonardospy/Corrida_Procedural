/* Pista: malhas instanciadas, trechos de cidade e mata */
import {ST} from './shared.js';
import {L,LANE_W,MAXC,N,NDEB,NDUST,NSM,ROAD_HALF,cfg,clamp,hash,lerp,smooth} from './config.js';
import {M,scene} from './scene.js';
import {PB,PCo,PCy,geo,tm} from './geometry.js';
import {PEDC,cartGeo,deerGeo,foxGeo,pedGeo,rabbitGeo,shopGeo,stallGeo,wrenchGeo} from './obstacles.js';
import {tunnelOf,underOf} from './tunnels.js';

/* ------------------------------------------------------------------ */
/* Malhas instanciadas                                                 */
/* ------------------------------------------------------------------ */
export const I={};
export const dummy=new THREE.Object3D();
export function setI(mesh,idx,x,y,z,sx,sy,sz,ry){
  dummy.position.set(x,y,z);dummy.rotation.set(0,ry||0,0);
  dummy.scale.set(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz);
  dummy.updateMatrix();mesh.setMatrixAt(idx,dummy.matrix);
}
export const hideI=(mesh,idx)=>setI(mesh,idx,0,-50,0,0,0,0,0);
/* tinted: a malha ganha cor por instância (o material precisa de vertexColors) */
function inst(name,geom,mat,count,tinted){
  const m=new THREE.InstancedMesh(geom,mat,count);
  m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for(let i=0;i<count;i++){hideI(m,i);if(tinted)m.setColorAt(i,tmpC.setHex(0xffffff));}
  scene.add(m);I[name]=m;return m;
}
const tmpC=new THREE.Color();
const tint=(mesh,idx,hex)=>mesh.setColorAt(idx,tmpC.setHex(hex));
const pickH=(arr,h)=>arr[Math.min(arr.length-1,Math.floor(h*arr.length))];
const Ico=(r,d)=>new THREE.IcosahedronGeometry(r,d||0);
const BX=(w,h,l)=>new THREE.BoxGeometry(w,h,l);

/* pista */
inst('asphalt',BX(ROAD_HALF*2,0.4,L+0.05),M.asphalt,N);
inst('dash',BX(0.2,0.03,5),M.line,N*2);
inst('edgeR',BX(0.22,0.03,L+0.05),M.line,N);
inst('edgeL',BX(0.22,0.03,L+0.05),M.yellow,N);
inst('curbR',BX(0.6,0.22,6),M.red,N*2);
inst('curbW',BX(0.6,0.22,6),M.white,N*2);
inst('ground',BX(120,0.5,L+0.05),M.ground,N*2);
/* guard-rail e postes de luz */
inst('rail',geo([PB(0.1,0.26,L+0.05,0,0.66,0,0xb4bac4),PB(0.08,0.1,L+0.05,0,0.46,0,0x8d94a0)]),M.vcol,N*2);
inst('post',geo([PB(0.12,0.66,0.12,0,0.33,0,0x5b616d)]),M.vcol,N*4);
inst('lamp',geo([PB(0.2,8.6,0.2,0,4.3,0,0x596070),PB(2.7,0.15,0.15,-1.35,8.55,0,0x596070),PB(0.5,0.5,0.5,0,0.25,0,0x4a505c)]),M.vcol,N);
inst('lhead',BX(0.9,0.14,0.4),M.lhead,N);
const poolG=new THREE.CircleGeometry(1,14);poolG.rotateX(-Math.PI/2);
inst('pool',poolG,M.pool,N);
/* vegetação */
/* pinheiros (4 camadas), árvores frondosas (5 copas) e bétulas; cada instância ganha um tom próprio */
const W1=0xffffff,W2=0xe2e2e2,W3=0xc8c8c8;
inst('fol',geo([PCo(2.0,2.4,8,0,2.3,0,W3),PCo(1.7,2.2,8,0.06,3.4,0.03,W2),PCo(1.35,2.0,8,-0.05,4.5,0,W1),PCo(0.95,1.7,8,0,5.5,0.03,W1)]),M.foliage,N*24,true);
inst('oak',geo([{g:Ico(1.6),m:tm(0,3.6,0,1.1,0.9,1.1),c:W1},{g:Ico(1.15),m:tm(-1.0,3.1,0.5),c:W2},{g:Ico(1.05),m:tm(0.95,3.2,-0.45),c:W2},
  {g:Ico(0.95),m:tm(0.2,4.4,-0.55),c:W1},{g:Ico(0.85),m:tm(-0.35,2.8,-0.8),c:W3}]),M.foliage2,N*24,true);
inst('trunk',geo([{g:new THREE.CylinderGeometry(0.2,0.34,2.4,6),m:tm(0,1.2,0)},{g:new THREE.CylinderGeometry(0.07,0.11,1.1,4),m:tm(0.42,2.3,0,1,1,1,0,0,-0.8)}]),M.trunk,N*24);
inst('birch',geo([PCy(0.12,0.17,4.6,6,0,2.3,0,0xf0ede4),PB(0.27,0.05,0.12,0.03,0.9,0.06,0x2a2a2a),PB(0.27,0.05,0.12,-0.03,1.7,-0.06,0x2a2a2a),
  PB(0.24,0.05,0.12,0.02,2.6,0.05,0x2a2a2a),PB(0.22,0.05,0.12,-0.02,3.4,-0.05,0x2a2a2a),
  {g:Ico(1.05),m:tm(0,4.7,0,0.9,1.35,0.9),c:0xa8cf5a},{g:Ico(0.7),m:tm(0.45,3.9,0.2),c:0x9cc24e},{g:Ico(0.6),m:tm(-0.4,4.2,-0.2),c:0xb6d966}]),M.vcol,N*24);
inst('bush',geo([{g:Ico(0.7),m:tm(0,0.4,0,1.2,0.8,1),c:W1},{g:Ico(0.5),m:tm(0.6,0.3,0.3),c:W2},{g:Ico(0.45),m:tm(-0.55,0.28,-0.2),c:W3}]),M.bush,N*12,true);
/* chão da mata: samambaias, flores e troncos caídos */
const fronds=[];for(let k=0;k<6;k++){const a=k/6*Math.PI*2;fronds.push({g:new THREE.ConeGeometry(0.16,1.1,3),m:tm(Math.cos(a)*0.3,0.35,Math.sin(a)*0.3,1,1,0.35,Math.sin(a)*0.9,-a,Math.cos(a)*0.9),c:k%2?W1:W2});}
inst('fern',geo(fronds),M.bush,N*8,true);
const petals=[PB(1.4,0.06,1.0,0,0.03,0,0x5d9a45)];
[[0.4,0.2,0xe94f4f],[-0.3,0.3,0xf2d23a],[0.1,-0.3,0xf4f1ea],[-0.5,-0.2,0xb06ae0],[0.55,-0.25,0xf2d23a],[-0.1,0.05,0xe94f4f]].forEach(function(f){petals.push(PB(0.03,0.28,0.03,f[0],0.18,f[1],0x4a8a3a),PB(0.14,0.08,0.14,f[0],0.34,f[1],f[2]));});
inst('flower',geo(petals),M.vcol,N*4);
inst('log',geo([{g:new THREE.CylinderGeometry(0.32,0.34,3.2,7),m:tm(0,0.3,0,1,1,1,0,0,Math.PI/2),c:0x6b4a32},{g:new THREE.CylinderGeometry(0.25,0.25,3.24,7),m:tm(0,0.3,0,1,1,1,0,0,Math.PI/2),c:0xc9a27a},
  {g:Ico(0.25),m:tm(0.6,0.62,0.1,1.2,0.5,1.2),c:0x5f9a48}]),M.vcol,N*2);
inst('rock',geo([{g:new THREE.IcosahedronGeometry(1,0),m:tm(0,0.6,0,1.3,0.9,1.1)}]),M.rock,N*2);
inst('mount',geo([{g:new THREE.ConeGeometry(1,1,5),m:tm(0,0.5,0)}]),M.mount,N);
/* prédios: faixas de janelas acendem à noite */
/* corpo branco (a cor vem da instância) e janelas numa malha à parte, para o tingimento não apagar a luz delas */
const lum=()=>{const v=Math.random()<0.25?0.3+Math.random()*0.2:0.65+Math.random()*0.35;return new THREE.Color(v,v,v).getHex();};
/* janelas soltas nas quatro faces de um bloco (w x d, centro cx,cz), andar a andar */
function winGrid(out,w,d,y0,y1,fh,wh,sp,cx,cz){
  cx=cx||0;cz=cz||0;
  const nz=Math.max(1,Math.round(d/sp)),nx=Math.max(1,Math.round(w/sp));
  for(let y=y0+fh*0.55;y<y1-0.5;y+=fh){
    for(let k=0;k<nz;k++){const z=cz-d/2+(k+0.5)*d/nz;out.push(PB(0.12,wh,d/nz*0.56,cx+w/2+0.03,y,z,lum()),PB(0.12,wh,d/nz*0.56,cx-w/2-0.03,y,z,lum()));}
    for(let k=0;k<nx;k++){const x=cx-w/2+(k+0.5)*w/nx;out.push(PB(w/nx*0.56,wh,0.12,x,y,cz+d/2+0.03,lum()),PB(w/nx*0.56,wh,0.12,x,y,cz-d/2-0.03,lum()));}
  }
}
/* fachada de vidro: uma faixa contínua por andar em cada face */
function winBands(out,w,d,y0,y1,fh,wh,cx,cz){
  cx=cx||0;cz=cz||0;
  for(let y=y0+fh*0.5;y<y1-0.4;y+=fh){
    const c=lum();
    out.push(PB(0.1,wh,d*0.94,cx+w/2+0.03,y,cz,c),PB(0.1,wh,d*0.94,cx-w/2-0.03,y,cz,c),PB(w*0.94,wh,0.1,cx,y,cz+d/2+0.03,c),PB(w*0.94,wh,0.1,cx,y,cz-d/2-0.03,c));
  }
}
const GREY=0xb4b0a8,DARK=0x5a606b,MET=0x8d94a0;
function antenna(B,W,x,y,z,h){B.push(PB(0.25,h,0.25,x,y+h/2,z,MET));W.push(PB(0.4,0.4,0.4,x,y+h+0.2,z,0xff3020));}
const BTYPES={
  /* residencial de 5 andares: térreo comercial, sacadas, caixa d'água */
  res:function(){
    const w=12,d=11,h=16,B=[PB(w,h,d,0,h/2,0,W1),PB(w+0.14,3.2,d+0.14,0,1.6,0,0x9e978c)],W=[];
    for(let y=3.2;y<h;y+=3.2)B.push(PB(w+0.3,0.16,d+0.3,0,y,0,0xe8e4dc));
    [-1,1].forEach(function(s){for(let y=6.4;y<h;y+=3.2)[-2.8,2.8].forEach(function(z){B.push(PB(0.9,0.12,2.4,s*(w/2+0.45),y,z,0xd8d4cc),PB(0.06,0.7,2.4,s*(w/2+0.88),y+0.4,z,MET));});});
    B.push(PB(w+0.2,0.6,0.2,0,h+0.3,d/2,GREY),PB(w+0.2,0.6,0.2,0,h+0.3,-d/2,GREY),PCy(1,1,1.6,8,-2.5,h+0.8,1.5,0x9aa0aa),PB(1.4,0.8,1,2.5,h+0.4,-2,MET));
    winGrid(W,w,d,3.2,h,3.2,1.5,2.4);W.push(PB(0.12,2,d*0.8,w/2+0.03,1.4,0,0xffffff),PB(0.12,2,d*0.8,-w/2-0.03,1.4,0,0xffffff));
    return {b:B,w:W,tint:[0xfff1d6,0xf6d7c3,0xd9ecf2,0xe8f3d9,0xf9e6a8,0xe9d5ef,0xffffff]};
  },
  /* tijolo de 7 andares: pilastras, cornija, torre de água sobre pernas */
  brick:function(){
    const w=11,d=11,h=23,B=[PB(w,h,d,0,h/2,0,W1),PB(w+0.6,0.5,d+0.6,0,h-0.25,0,0xd8d0c0),PB(w+0.16,1.1,d+0.16,0,0.55,0,0x6c6058)],W=[];
    [-1,1].forEach(function(a){[-1,1].forEach(function(b){B.push(PB(0.5,h-0.5,0.5,a*w/2,(h-0.5)/2,b*d/2,0xe6dccd));});});
    for(let y=6.5;y<h-1;y+=6.5)B.push(PB(w+0.24,0.22,d+0.24,0,y,0,0xe6dccd));
    [-1,1].forEach(function(a){[-1,1].forEach(function(b){B.push(PB(0.14,2,0.14,1.5+a*0.8,h+1,-1.5+b*0.8,0x4a3a2e));});});
    B.push(PCy(1.15,1.15,1.8,8,1.5,h+2.9,-1.5,0x8a6a4a),PCo(1.3,0.9,8,1.5,h+4.25,-1.5,0x5a4a3a));
    winGrid(W,w,d,1.1,h-0.6,3.2,1.7,2.2);
    return {b:B,w:W,tint:[0xc0603e,0xa14b34,0xb87a52,0x8c5a44,0xd08a5c,0xb06a50]};
  },
  /* escritório de vidro: faixas de janela e aletas verticais */
  office:function(){
    const w=14,d=14,h=44,B=[PB(w,h,d,0,h/2,0,W1),PB(w*0.6,2.6,d*0.6,0,h+1.3,0,0xb0b4ba),PB(w+0.3,1.2,d+0.3,0,h-0.6,0,0xd8dce0)],W=[];
    [-1,1].forEach(function(s){for(let k=-2;k<=2;k++){B.push(PB(0.22,h-1,0.3,s*(w/2+0.08),(h-1)/2,k*2.8,DARK),PB(0.3,h-1,0.22,k*2.8,(h-1)/2,s*(d/2+0.08),DARK));}});
    antenna(B,W,2,h+2.6,2,6);
    winBands(W,w,d,0,h-1.2,3.6,2.3);
    return {b:B,w:W,tint:[0x9fb6cc,0xb7c3cf,0x8fa8a0,0xc7c2b8,0xa8b8c4]};
  },
  /* torre escalonada com recuos e mastro */
  tower:function(){
    const B=[],W=[],t=[[14,14,0,46],[11,11,46,60],[8,8,60,70]];
    t.forEach(function(q,n){B.push(PB(q[0],q[3]-q[2],q[1],0,(q[2]+q[3])/2,0,W1),PB(q[0]+0.4,0.6,q[1]+0.4,0,q[3]-0.3,0,0xd8dce0));winBands(W,q[0],q[1],q[2],q[3]-0.6,3.6,2.2);});
    antenna(B,W,0,70,0,12);
    return {b:B,w:W,tint:[0xa9bcd0,0x90a4b8,0xc9b89a,0x7f9fae,0xb8c4b0]};
  },
  /* arranha-céu fino de vidro com coroa e agulha (centro da cidade) */
  core1:function(){
    const w=12,d=12,h=100,B=[PB(w,h,d,0,h/2,0,W1),PB(w+0.6,3,d+0.6,0,1.5,0,0x6c7078)],W=[];
    [-1,1].forEach(function(a){[-1,1].forEach(function(b){B.push(PB(0.6,h+7,0.6,a*(w/2-0.3),(h+7)/2,b*(d/2-0.3),0xd8dce0));});});
    B.push(PB(w*0.7,4,d*0.7,0,h+2,0,0xb0b4ba));
    antenna(B,W,0,h+4,0,18);
    winBands(W,w,d,3,h,3.5,2.6);
    return {b:B,w:W,tint:[0x7fa8c8,0x6b8fa8,0xa0b4c8,0x5f8e9a,0xc9a86a,0x8aa0b4]};
  },
  /* arranha-céu largo em dois blocos com heliponto */
  core2:function(){
    const B=[PB(16,84,12,0,42,0,W1),PB(11,34,9,-1.5,84+17,0,W1),PB(16.6,3,12.6,0,1.5,0,0x5a606b),PB(16.4,0.8,12.4,0,84,0,0xd8dce0)],W=[];
    B.push(PCy(3.6,3.6,0.4,12,-1.5,118.2,0,0x5a5e66),PB(0.4,0.06,2.2,-2.4,118.43,0,0xf4f1ea),PB(0.4,0.06,2.2,-0.6,118.43,0,0xf4f1ea),PB(1.4,0.06,0.4,-1.5,118.43,0,0xf4f1ea));
    antenna(B,W,3.5,84.4,3,10);
    winBands(W,16,12,3,84,3.5,2.5);winBands(W,11,9,84,118,3.5,2.5,-1.5,0);
    return {b:B,w:W,tint:[0x86a6c0,0x9db0bf,0x6f8796,0xb8a37a,0x7c96a8]};
  }
};
const BLD={};
for(const k in BTYPES){
  const t=BTYPES[k]();
  BLD[k]={tint:t.tint,b:inst('bld_'+k,geo(t.b),M.vcol,N*2,true),w:inst('win_'+k,geo(t.w),M.win,N*2)};
}
const BNAMES=Object.keys(BLD);
function hideBld(q){BNAMES.forEach(function(k){hideI(BLD[k].b,q);hideI(BLD[k].w,q);});}
/* tons por instância: pinheiros, frondosas (com algumas de outono) e arbustos */
const PINE_T=[0xffffff,0xdcefd4,0xeef8d0,0xc8dcc8,0xe8f0e0,0xd0e8e0];
const OAK_T=[0xb8e09a,0x9ccc80,0xd0e8a0,0x88c070,0xc8d890,0xa8d48a,0xf0b060,0xe08a50];
const BUSH_T=[0xffffff,0xd8f0c8,0xf0f8d8,0xc0dcb0,0xe0f0c0];
function hideNature(TB,BB,q){
  for(let k=0;k<12;k++){hideI(I.fol,TB+k);hideI(I.oak,TB+k);hideI(I.trunk,TB+k);hideI(I.birch,TB+k);}
  for(let k=0;k<6;k++)hideI(I.bush,BB+k);
  for(let k=0;k<4;k++)hideI(I.fern,q*4+k);
  hideI(I.flower,q*2);hideI(I.flower,q*2+1);hideI(I.log,q);
  hideI(I.rock,q);hideI(I.adeer,q);hideI(I.afox,q);hideI(I.arabbit,q);
}
/* rua transversal e faixa de pedestres (cruzamentos da cidade) */
inst('xroad',BX(160,0.4,9.2),M.asphalt,N);
inst('zebra',BX(0.6,0.03,2.4),M.line,N*18);
/* túneis: casca extrudada ao longo da faixa (sem tampas, para emendar com a vizinha) */
function sleeve(pts,len,colOf){
  const P=[],C=[],c=new THREE.Color(),z0=-len/2,z1=len/2;
  for(let k=0;k<pts.length-1;k++){
    const a=pts[k],b=pts[k+1];
    c.set(colOf?colOf((a[1]+b[1])/2):0xffffff);
    P.push(a[0],a[1],z0,b[0],b[1],z0,b[0],b[1],z1, a[0],a[1],z0,b[0],b[1],z1,a[0],a[1],z1);
    for(let n=0;n<6;n++)C.push(c.r,c.g,c.b);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.computeVertexNormals();return g;
}
const HILL=[[-48,-0.3],[-38,5],[-29,11],[-20,17],[-12,21],[-5,23.5],[3,23],[11,20.5],[19,16],[28,10.5],[37,5],[48,-0.3]];
const ARCH=[[6.7,-0.1],[6.7,5.2],[5.9,6.7],[4.2,7.7],[2.1,8.2],[0,8.35]];
const TUBE=ARCH.concat(ARCH.slice(0,-1).reverse().map(p=>[-p[0],p[1]]));
const shapeOf=(pts,close)=>{const s=new THREE.Shape();pts.forEach((p,k)=>k?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));close.forEach(p=>s.lineTo(p[0],p[1]));return s;};
const archHole=()=>{const h=new THREE.Path();TUBE.forEach((p,k)=>k?h.lineTo(p[0],p[1]):h.moveTo(p[0],p[1]));return h;};
const capS=shapeOf(HILL,[[48,-2],[-48,-2]]);capS.holes.push(archHole());
const frameS=shapeOf([[-9.4,-2],[9.4,-2],[9.4,10.4],[-9.4,10.4]],[]);frameS.holes.push(archHole());
inst('tunHill',sleeve(HILL,L+0.05),M.hill,N);
inst('tunTube',sleeve(TUBE,L+0.05,y=>y<1?0x44474f:(y<5.3?0xd6cfbd:0x5d616c)),M.tube,N);
inst('tunCap',new THREE.ShapeGeometry(capS),M.hill,N);
inst('tunFrame',geo([{g:new THREE.ShapeGeometry(frameS),m:tm(0,0,0.08),c:0x9a958a},PB(18.8,0.6,0.5,0,10.1,0.2,0xff5a36)]),M.tube,N);
inst('tlamp',BX(0.32,0.12,5),M.tlamp,N*2);
/* passagem subterrânea: muros de arrimo com mureta e laje de cobertura no nível da rua */
inst('upWall',geo([PB(0.6,8.1,L+0.05,-6.4,-3.15,0,0xb3ad9f),PB(0.6,8.1,L+0.05,6.4,-3.15,0,0xb3ad9f),
  PB(0.66,0.14,L+0.05,-6.4,0.92,0,0xffc24a),PB(0.66,0.14,L+0.05,6.4,0.92,0,0xffc24a)]),M.upw,N);
inst('upRoof',geo([PB(13.4,0.8,L+0.05,0,-0.1,0,0x8d8a84),PB(13.4,0.06,L+0.05,0,0.33,0,0x6f6c68)]),M.upw,N);
/* calçadas, lojas, barracas e pedestres da cidade */
inst('walk',BX(4.3,0.3,L+0.05),M.sidew,N*2);
const SHOPG=[shopGeo(0xe3c9a0,0xd8433a,0xf2efe6,0x2f6fd6),shopGeo(0xc9d6e3,0x2a9d6f,0xf2efe6,0xd8433a),shopGeo(0xe8b5a0,0x3a7bd5,0xf2efe6,0x2a2d3a)];
SHOPG.forEach(function(g,n){inst('shop'+n,g,[M.vcol,M.win],N*2);});
const STALLG=[stallGeo(0xd8433a,0xf2efe6,[0xe94f4f,0xf2b705,0x57a05a]),stallGeo(0x2f6fd6,0xf2efe6,[0xf2b705,0xff7a1a,0xe94f4f]),cartGeo(0xff7a1a),cartGeo(0x2ec4b6)];
STALLG.forEach(function(g,n){inst('stall'+n,g,M.vcol,N*2);});
PEDC.forEach(function(c,n){inst('sped'+n,pedGeo(c,true,0,n),M.vcol,N*4);});
/* calçada: árvores em canteiros e bancos */
inst('stree',geo([PB(1.1,0.45,1.1,0,0.22,0,0x8d8a84),PB(0.9,0.06,0.9,0,0.46,0,0x5a4632),{g:new THREE.CylinderGeometry(0.11,0.15,2.6,5),m:tm(0,1.6,0),c:0x6b4a32},
  {g:Ico(1.1),m:tm(0,3.4,0,1,0.85,1),c:0x5e9e4a},{g:Ico(0.75),m:tm(0.55,3.0,0.3),c:0x6aae52},{g:Ico(0.7),m:tm(-0.45,3.1,-0.35),c:0x529444}]),M.vcol,N*2);
inst('bench',geo([PB(0.5,0.08,1.8,0,0.48,0,0x9a6a3e),PB(0.08,0.45,1.8,0.22,0.78,0,0x9a6a3e),PB(0.45,0.45,0.08,0,0.24,-0.75,0x3a3d46),PB(0.45,0.45,0.08,0,0.24,0.75,0x3a3d46)]),M.vcol,N*2);
export const sw=[];for(let i=0;i<N*4;i++)sw.push({on:false});
ST.walkT=0;
function cityHide(s,q,j){
  hideI(I.walk,q);
  for(let n=0;n<3;n++)hideI(I['shop'+n],q);
  for(let n=0;n<4;n++)hideI(I['stall'+n],q);
  hideI(I.stree,q);hideI(I.bench,q);
  for(let k=0;k<2;k++){const ix=s*4+j*2+k;sw[ix].on=false;for(let n=0;n<PEDC.length;n++)hideI(I['sped'+n],ix);}
}
function streetscape(i,s,q,j,sd,z,city,under,core){
  if(!city){cityHide(s,q,j);return;}
  setI(I.walk,q,sd*8.25,0.07,z);
  const ry=sd<0?Math.PI/2:-Math.PI/2;
  const sv=Math.floor(hash(i,j*7+70)*3), hasShop=hash(i,j*7+71)<0.92;
  for(let n=0;n<3;n++){if(hasShop&&n===sv)setI(I['shop'+n],q,sd*13.4,0,z,1,1,1,ry);else hideI(I['shop'+n],q);}
  const lampSide=(((i%3)+3)%3===0)?((Math.floor(i/3)&1)?1:-1):0;
  /* barracas raras e quase nunca carrinho; no centro, nenhuma */
  const st=hash(i,j*7+72)<0.8?Math.floor(hash(i,j*7+75)*2):2+Math.floor(hash(i,j*7+76)*2), hasSt=hash(i,j*7+73)<0.16&&sd!==lampSide&&!under&&core<0.5;
  for(let n=0;n<4;n++){if(hasSt&&n===st)setI(I['stall'+n],q,sd*7.6,0.22,z-2.5,1,1,1,ry);else hideI(I['stall'+n],q);}
  /* árvore no canteiro e banco ao lado */
  if(hash(i,j*7+77)<0.7)setI(I.stree,q,sd*9.9,0.07,z+3.2,1,0.9+hash(i,j*7+78)*0.3,1,hash(i,j*7+79)*6.28);else hideI(I.stree,q);
  if(!hasSt&&hash(i,j*7+90)<0.3)setI(I.bench,q,sd*9.7,0.07,z-2.6,1,1,1,sd<0?0:Math.PI);else hideI(I.bench,q);
  for(let k=0;k<2;k++){
    const ix=s*4+j*2+k, on=cfg.ped>0.05&&hash(i,j*11+80+k)<(core>0.5?0.95:0.8);
    for(let n=0;n<PEDC.length;n++)hideI(I['sped'+n],ix);
    if(!on){sw[ix].on=false;continue;}
    const h=function(o){return hash(i,j*11+81+k*5+o);};
    /* no centro, a maioria é executivo de terno e pasta */
    const v=core>0.5&&h(9)<0.7?4+Math.floor(h(10)*2):Math.floor(h(0)*4);
    sw[ix]={on:true,v:v,x:sd*(7.0+h(1)*2.0),z0:z+(h(2)-0.5)*4,amp:h(3)<0.35?0:2.5+h(4)*2.5,om:0.25+h(5)*0.25,ph:h(6)*6.28,sc:1+h(7)*0.15,ry0:h(8)<0.5?0:Math.PI};
  }
}
export function updateWalkers(){
  for(let i=0;i<sw.length;i++){
    const w=sw[i];if(!w.on)continue;
    const a=w.om*ST.walkT+w.ph, z=w.z0+w.amp*Math.sin(a);
    const ry=w.amp===0?w.ry0:(Math.cos(a)>0?Math.PI:0);
    setI(I['sped'+w.v],i,w.x,0.22+(w.amp>0?Math.abs(Math.sin(ST.walkT*6+w.ph))*0.06:0),z,w.sc,w.sc,w.sc,ry);
  }
  for(let n=0;n<PEDC.length;n++)I['sped'+n].instanceMatrix.needsUpdate=true;
}
/* animais da mata (enfeite) */
inst('adeer',deerGeo(),M.vcol,N*2);
inst('afox',foxGeo(),M.vcol,N*2);
inst('arabbit',rabbitGeo(),M.vcol,N*2);
/* efeitos */
inst('wrench',wrenchGeo,M.wrench,8);
inst('coin',geo([{g:new THREE.CylinderGeometry(0.5,0.5,0.14,10),m:tm(0,0,0,1,1,1,Math.PI/2,0,0)}]),M.coin,MAXC);
inst('deb',BX(0.32,0.32,0.32),M.deb,NDEB);
inst('smoke',geo([{g:new THREE.IcosahedronGeometry(0.4,0)}]),M.smoke,NSM);
inst('dust',geo([{g:new THREE.IcosahedronGeometry(0.4,0)}]),M.dust,NDUST);

ST.lastTile=0;ST.dirty=false;
/* cada trecho de 14 faixas sorteia, por lado, floresta, cidade ou campo aberto */
/* 0 = floresta, 1 = cidade; muda de forma gradual a cada ~500 m. Os dois lados seguem o mesmo trecho. */
/* trechos longos: floresta ~4 a 5 km, cidade ~2 a 3 km, com transição suave de ~340 m */
const SB=[0], CT=170;
const segLen=k=>k%2===0?2300+hash(k,7)*800:4200+hash(k,3)*1100;
export function segStart(k){while(SB.length<=k)SB.push(SB[SB.length-1]+segLen(SB.length-1));return SB[k];}
function cityM(m){
  if(m<0)return 1;
  let k=0;while(segStart(k+1)<=m)k++;
  let v=0;
  for(let c=Math.max(0,k-1);c<=k+1;c++){
    if(c%2!==0)continue;
    const a=segStart(c),b=segStart(c+1);
    v=Math.max(v,Math.min(c===0?1:smooth(a-CT,a+CT,m),1-smooth(b-CT,b+CT,m)));
  }
  return v;
}
export const cityK=i=>cityM(i*L);
/* 0 na periferia, 1 no centro: a mais de ~850 m das bordas de uma cidade começam os arranha-céus */
export function cityCore(i){
  const m=i*L;if(m<0)return 0;
  let k=0;while(segStart(k+1)<=m)k++;
  if(k%2)return 0;
  return smooth(450,850,Math.min(m-segStart(k),segStart(k+1)-m));
}
export const isX=i=>i>=24&&cityK(i)>0.85&&(((i%20)+20)%20)===5;
export const hasLamp=i=>((i%3)+3)%3===0&&!isX(i)&&!tunnelOf(i)&&!underOf(i);
export function placeTile(i){
  const s=((i%N)+N)%N, z=-i*L, zone=Math.floor(i/14);
  const ck=cityK(i), fw=1-ck, xr=isX(i), tun=tunnelOf(i), up=underOf(i);
  setI(I.asphalt,s,0,-0.2,z);
  /* túnel da mata: montanha, revestimento, bocas e luminárias */
  if(tun){
    setI(I.tunHill,s,0,0,z);setI(I.tunTube,s,0,0,z);
    if(i===tun.s){setI(I.tunCap,s,0,0,z+L/2);setI(I.tunFrame,s,0,0,z+L/2);}
    else if(i===tun.e-1){setI(I.tunCap,s,0,0,z-L/2,1,1,1,Math.PI);setI(I.tunFrame,s,0,0,z-L/2,1,1,1,Math.PI);}
    else{hideI(I.tunCap,s);hideI(I.tunFrame,s);}
  }else{hideI(I.tunHill,s);hideI(I.tunTube,s);hideI(I.tunCap,s);hideI(I.tunFrame,s);}
  /* passagem subterrânea: muros em todo o trecho, laje só na parte funda */
  const upCov=up&&i>=up.s+3&&i<up.e-3;
  if(up)setI(I.upWall,s,0,0,z);else hideI(I.upWall,s);
  if(upCov)setI(I.upRoof,s,0,0,z);else hideI(I.upRoof,s);
  for(let j=0;j<2;j++){
    if(tun)setI(I.tlamp,s*2+j,(j?1:-1)*4.1,7.55,z);
    else if(upCov)setI(I.tlamp,s*2+j,(j?1:-1)*3.2,-0.56,z);
    else hideI(I.tlamp,s*2+j);
  }
  if(xr){
    hideI(I.dash,s*2);hideI(I.dash,s*2+1);hideI(I.edgeL,s);hideI(I.edgeR,s);
    setI(I.xroad,s,0,-0.195,z);
    for(let m=0;m<18;m++)setI(I.zebra,s*18+m,-4.8+(m%9)*1.2,0.022,m<9?z+5.9:z-5.9);
  }else{
    setI(I.dash,s*2,-LANE_W/2,0.016,z);setI(I.dash,s*2+1,LANE_W/2,0.016,z);
    setI(I.edgeL,s,-5.15,0.017,z);setI(I.edgeR,s,5.15,0.017,z);
    hideI(I.xroad,s);for(let m=0;m<18;m++)hideI(I.zebra,s*18+m);
  }
  const core=cityCore(i);
  for(let j=0;j<2;j++){
    const sd=j?1:-1, q=s*2+j, TB=s*24+j*12, BB=s*12+j*6, city=ck>0.55;
    setI(I.ground,q,sd*66.1,-0.33,z);
    if(xr||tun){
      /* no cruzamento e dentro da montanha não há mureta, árvores, pedras, bichos nem prédios */
      if(xr){hideI(I.curbR,q);hideI(I.curbW,q);}else{setI(I.curbR,q,sd*5.8,0.11,z-3);setI(I.curbW,q,sd*5.8,0.11,z+3);}
      hideI(I.rail,q);hideI(I.post,s*4+j*2);hideI(I.post,s*4+j*2+1);
      hideNature(TB,BB,q);hideBld(q);
      cityHide(s,q,j);
      continue;
    }
    setI(I.curbR,q,sd*5.8,0.11,z-3);setI(I.curbW,q,sd*5.8,0.11,z+3);
    if(city){hideI(I.rail,q);hideI(I.post,s*4+j*2);hideI(I.post,s*4+j*2+1);}
    else{setI(I.rail,q,sd*6.6,0,z);setI(I.post,s*4+j*2,sd*6.6,0,z-3);setI(I.post,s*4+j*2+1,sd*6.6,0,z+3);}
    /* mata densa: 12 árvores por trecho e lado, rareando na cidade */
    const treeK=1-smooth(0.3,0.58,ck), pT=clamp((0.14+0.86*Math.pow(fw,0.7))*cfg.forest*treeK,0,1), spread=lerp(40,6,ck);
    for(let k=0;k<12;k++){
      const t=TB+k, o=200+j*100+k*7;
      if(hash(i,o+1)<pT){
        const x=sd*(10.5+Math.pow(hash(i,o+3),1.25)*spread), zz=z+(hash(i,o+4)-0.5)*L;
        const sc=0.8+hash(i,o+5)*1.0, ry=hash(i,o+6)*6.28, kind=hash(i,o+9), th=hash(i,o+10);
        /* metade pinheiros, um terço frondosas (algumas já de outono) e o resto bétulas */
        if(kind<0.5){setI(I.fol,t,x,0,zz,sc,sc*(0.9+hash(i,o+8)*0.5),sc,ry);tint(I.fol,t,pickH(PINE_T,th));hideI(I.oak,t);hideI(I.birch,t);setI(I.trunk,t,x,0,zz,sc,sc,sc,ry);}
        else if(kind<0.86){setI(I.oak,t,x,0,zz,sc,sc,sc,ry);tint(I.oak,t,pickH(OAK_T,th));hideI(I.fol,t);hideI(I.birch,t);setI(I.trunk,t,x,0,zz,sc,sc,sc,ry);}
        else{setI(I.birch,t,x,0,zz,sc*0.9,sc,sc*0.9,ry);hideI(I.fol,t);hideI(I.oak,t);hideI(I.trunk,t);}
      }else{hideI(I.fol,t);hideI(I.oak,t);hideI(I.trunk,t);hideI(I.birch,t);}
    }
    /* sub-bosque: arbustos */
    const pB=clamp((0.12+0.78*fw)*cfg.forest*treeK,0,1);
    for(let k=0;k<6;k++){
      const o=500+j*60+k*5;
      if(hash(i,o+1)<pB){
        const sc=0.7+hash(i,o+4)*0.8;
        setI(I.bush,BB+k,sd*(7.4+Math.pow(hash(i,o+2),1.2)*14),0,z+(hash(i,o+3)-0.5)*L,sc,sc,sc,hash(i,o+5)*6.28);
        tint(I.bush,BB+k,pickH(BUSH_T,hash(i,o+6)));
      }else hideI(I.bush,BB+k);
    }
    /* chão da mata: samambaias, flores e de vez em quando um tronco caído */
    const pG=clamp(fw*fw*cfg.forest,0,1);
    for(let k=0;k<4;k++){
      const o=560+j*40+k*6, f=q*4+k;
      if(hash(i,o)<0.85*pG){const sc=0.7+hash(i,o+3)*0.7;setI(I.fern,f,sd*(7.2+hash(i,o+1)*16),0,z+(hash(i,o+2)-0.5)*L,sc,sc,sc,hash(i,o+4)*6.28);tint(I.fern,f,pickH(BUSH_T,hash(i,o+5)));}
      else hideI(I.fern,f);
    }
    for(let k=0;k<2;k++){
      const o=620+j*20+k*6;
      if(hash(i,o)<0.35*pG)setI(I.flower,q*2+k,sd*(7.6+hash(i,o+1)*12),0,z+(hash(i,o+2)-0.5)*L,1,1,1,hash(i,o+3)*6.28);else hideI(I.flower,q*2+k);
    }
    if(hash(i,j+650)<0.12*pG)setI(I.log,q,sd*(9+hash(i,j+651)*14),0,z+(hash(i,j+652)-0.5)*L,1,1,1,hash(i,j+653)*6.28);else hideI(I.log,q);
    /* pedras */
    if(hash(i,j*5+40)<lerp(0.35,0.08,ck)*treeK){
      const sc=0.5+hash(i,j*5+44)*1.1;
      setI(I.rock,q,sd*(8+hash(i,j*5+42)*22),-0.1,z+(hash(i,j*5+43)-0.5)*L,sc,sc,sc,hash(i,j*5+45)*6.28);
    }else hideI(I.rock,q);
    /* animais na mata */
    const an=Math.floor(hash(i,j*3+300)*3), showA=hash(i,j*3+301)<0.16*fw*fw*fw*cfg.forest;
    ['adeer','afox','arabbit'].forEach(function(nm,n){
      if(showA&&n===an){
        const sc=n===0?1:(n===1?1.8:2.2);
        setI(I[nm],q,sd*(10.5+hash(i,j*3+302)*14),0,z+(hash(i,j*3+303)-0.5)*L,sc,sc,sc,hash(i,j*3+304)*6.28);
      }else hideI(I[nm],q);
    });
    /* prédios (só na cidade) */
    /* prédios (só na cidade): perto da rua os baixos, ao fundo os altos; no centro, arranha-céus colados na avenida */
    const here=ck>0.55&&hash(i,j*9+61)<0.92&&!(isX(i-1)||isX(i+1)||isX(i-2)||isX(i+2));
    hideBld(q);
    if(here){
      const inC=core>0.5, far=hash(i,j*9+64)<(inC?0.35:0.45);
      const list=inC?(far?['core1','core2','tower']:['office','core1','core2','tower']):(far?['office','tower','brick']:['res','brick','res','brick']);
      const k=pickH(list,hash(i,j*9+60)), bl=BLD[k];
      const x=sd*(far?(48+hash(i,j*9+62)*26):((inC?26:24)+hash(i,j*9+62)*(inC?6:10)));
      const zz=z+(hash(i,j*9+63)-0.5)*2, ry=hash(i,j*9+65)<0.5?0:Math.PI/2;
      setI(bl.b,q,x,0,zz,1,1,1,ry);setI(bl.w,q,x,0,zz,1,1,1,ry);tint(bl.b,q,pickH(bl.tint,hash(i,j*9+66)));
    }
    streetscape(i,s,q,j,sd,z,city,!!up,core);
  }
  /* postes de luz: um a cada 36 m, alternando o lado (nunca em cruzamento, túnel ou passagem) */
  if(hasLamp(i)){
    const sd=(Math.floor(i/3)&1)?1:-1;
    setI(I.lamp,s,sd*7.6,0,z,1,1,1,sd>0?0:Math.PI);
    setI(I.lhead,s,sd*5.1,8.42,z);
    setI(I.pool,s,sd*3.9,0.035,z,4.6,1,6.5,0);
  }else{hideI(I.lamp,s);hideI(I.lhead,s);hideI(I.pool,s);}
  /* montanhas ao fundo (mais frequentes perto dos túneis) */
  const nearTun=tunnelOf(i-6)||tunnelOf(i+6)||tun;
  if(hash(i,90)<(nearTun?0.9:0.4)){
    const sd=hash(i,91)<0.5?-1:1, w=16+hash(i,93)*22, hg=14+hash(i,94)*24;
    setI(I.mount,s,sd*(60+hash(i,92)*55),-0.1,z,w,hg,w,hash(i,95)*6.28);
  }else hideI(I.mount,s);
  ST.dirty=true;
}
export function flushInstances(){
  if(!ST.dirty)return;
  for(const k in I){I[k].instanceMatrix.needsUpdate=true;if(I[k].instanceColor)I[k].instanceColor.needsUpdate=true;}
  ST.dirty=false;
}
