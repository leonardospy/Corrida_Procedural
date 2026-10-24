/* Geometria low poly: utilitários de malha, rodas, faróis, giroflex */
import {clamp} from './config.js';
import {M} from './scene.js';

/* ------------------------------------------------------------------ */
/* Geometria low poly                                                  */
/* ------------------------------------------------------------------ */
export const UB=new THREE.BoxGeometry(1,1,1);
export const tm=(x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
export const PB=(w,h,l,x,y,z,c)=>({g:UB,m:tm(x,y,z,w,h,l),c:c});
export const PCy=(r1,r2,h,s,x,y,z,c,rx=0,ry=0,rz=0)=>({g:new THREE.CylinderGeometry(r1,r2,h,s),m:tm(x,y,z,1,1,1,rx,ry,rz),c:c});
export const PCo=(r,h,s,x,y,z,c)=>({g:new THREE.ConeGeometry(r,h,s),m:tm(x,y,z),c:c});
export function geo(parts){
  const P=[],C=[],col=new THREE.Color();
  parts.forEach(p=>{
    const g=p.g.index?p.g.toNonIndexed():p.g.clone();
    if(p.m)g.applyMatrix4(p.m);
    const a=g.attributes.position.array;
    col.set(p.c===undefined?0xffffff:p.c);
    for(let i=0;i<a.length;i+=3){P.push(a[i],a[i+1],a[i+2]);C.push(col.r,col.g,col.b);}
    g.dispose();
  });
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  out.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  out.computeVertexNormals();
  return out;
}
const GLASS=0x1b2336, BUMP=0x22232b, UNDER=0x111118, TYRE=0x15151a;

/* Tronco de pirâmide: base wb x lb embaixo, topo wt x lt deslocado dz em z (z positivo = traseira). Corrige o sentido das faces sozinho. */
export function FR(wb,wt,lb,lt,h,x,y,z,c,dz){
  dz=dz||0;
  const v=[
    -wb/2,0,-lb/2, wb/2,0,-lb/2, wb/2,0,lb/2, -wb/2,0,lb/2,
    -wt/2,h,-lt/2+dz, wt/2,h,-lt/2+dz, wt/2,h,lt/2+dz, -wt/2,h,lt/2+dz];
  const idx=[0,1,2,0,2,3, 4,5,6,4,6,7, 0,1,5,0,5,4, 1,2,6,1,6,5, 2,3,7,2,7,6, 3,0,4,3,4,7];
  let cx=0,cy=0,cz=0;
  for(let i=0;i<8;i++){cx+=v[i*3];cy+=v[i*3+1];cz+=v[i*3+2];}
  cx/=8;cy/=8;cz/=8;
  for(let t=0;t<idx.length;t+=3){
    const a=idx[t]*3,b=idx[t+1]*3,d=idx[t+2]*3;
    const ux=v[b]-v[a],uy=v[b+1]-v[a+1],uz=v[b+2]-v[a+2];
    const wx=v[d]-v[a],wy=v[d+1]-v[a+1],wz=v[d+2]-v[a+2];
    const nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;
    const fx=(v[a]+v[b]+v[d])/3-cx,fy=(v[a+1]+v[b+1]+v[d+1])/3-cy,fz=(v[a+2]+v[b+2]+v[d+2])/3-cz;
    if(nx*fx+ny*fy+nz*fz<0){const s=idx[t+1];idx[t+1]=idx[t+2];idx[t+2]=s;}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  g.setIndex(idx);
  return {g:g,m:tm(x,y,z),c:c};
}
/* Une corpo (material 0) e luzes (material 1, sem iluminação) numa só malha */
export const H=(x,y,z,R,c)=>({x:x,y:y,z:z,R:R,c:c});
/* disco de brilho suave: cor no centro, preto na borda (soma de luz, sem bordas duras) */
export function haloArr(list){
  const Pp=[],Cc=[],SEG=10;
  list.forEach(function(h){
    const col=new THREE.Color(h.c);
    for(let i=0;i<SEG;i++){
      const a0=i/SEG*Math.PI*2,a1=(i+1)/SEG*Math.PI*2;
      Pp.push(h.x,h.y,h.z,h.x+Math.cos(a0)*h.R,h.y+Math.sin(a0)*h.R,h.z,h.x+Math.cos(a1)*h.R,h.y+Math.sin(a1)*h.R,h.z);
      Cc.push(col.r,col.g,col.b,0,0,0,0,0,0);
    }
  });
  return {P:Pp,C:Cc};
}
export function geoL(body,lights,halos){
  const a=geo(body), b=geo(lights);
  const pa=a.attributes.position.array,pb=b.attributes.position.array;
  const ca=a.attributes.color.array,cb=b.attributes.color.array;
  const h=halos&&halos.length?haloArr(halos):{P:[],C:[]};
  const na=pa.length,nb=pb.length,nh=h.P.length;
  const P=new Float32Array(na+nb+nh),Q=new Float32Array(na+nb+nh);
  P.set(pa);P.set(pb,na);P.set(h.P,na+nb);
  Q.set(ca);Q.set(cb,na);Q.set(h.C,na+nb);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));
  g.setAttribute('color',new THREE.BufferAttribute(Q,3));
  g.computeVertexNormals();
  g.addGroup(0,na/3,0);
  g.addGroup(na/3,nb/3,1);
  if(nh)g.addGroup((na+nb)/3,nh/3,2);
  a.dispose();b.dispose();
  return g;
}
export const wheelS=(x,z,r,w)=>[PCy(r,r,w,10,x,r,z,TYRE,0,0,Math.PI/2),PCy(r*0.62,r*0.62,w+0.03,8,x,r,z,0xb9bfc9,0,0,Math.PI/2)];
const W4=(x,z,r,w)=>[].concat(wheelS(-x,-z,r,w),wheelS(x,-z,r,w),wheelS(-x,z,r,w),wheelS(x,z,r,w));
const LH=(x,y,z)=>PB(0.42,0.13,0.05,x,y,z,0xfff3c4);
const LT=(x,y,z)=>PB(0.5,0.12,0.05,x,y,z,0xff2d2d);

/* Roda com pneu, aro e cinco raios: os raios mostram o giro */
export function wheelGeo(r,w){
  const p=[
    PCy(r,r,w,12,0,0,0,0x16161b,0,0,Math.PI/2),
    PCy(r*0.64,r*0.64,w+0.03,10,0,0,0,0x9aa1ad,0,0,Math.PI/2),
    PCy(r*0.2,r*0.2,w+0.06,6,0,0,0,0x2a2c34,0,0,Math.PI/2)
  ];
  for(let k=0;k<5;k++)p.push({g:UB,m:tm(0,0,0,w+0.05,r*1.2,r*0.13,k*Math.PI/5,0,0),c:0xe9ecf0});
  return geo(p);
}
/* Cone de luz do farol: ponta no carro, apaga com a distância */
const BEAM=(function(){
  const g=new THREE.ConeGeometry(1.3,26,14,1,true);g.translate(0,-13,0);g.rotateX(Math.PI/2);
  const pos=g.attributes.position, col=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    const t=clamp(-pos.getZ(i)/26,0,1), v=Math.pow(1-t,1.6);
    col[i*3]=v;col[i*3+1]=v*0.95;col[i*3+2]=v*0.8;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g;
})();
/* Giroflex das barricadas: dois raios opostos que giram */
const RAYS=(function(){
  const P=[],Cc=[],Ln=4.5,Wd=1.0;
  [1,-1].forEach(function(s){P.push(0,0,0,-Wd*0.5,0,s*Ln,Wd*0.5,0,s*Ln);Cc.push(1,0.62,0.08,0,0,0,0,0,0);});
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));
  return g;
})();
export function makeBeacon(){
  const g=new THREE.Group();
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,0.3,8),M.beacon);lamp.position.y=1.3;
  const rays=new THREE.Mesh(RAYS,M.rays);rays.position.y=1.32;
  g.add(lamp,rays);g.userData.rays=rays;
  return g;
}
