/* Carros (versão 2): carroceria low poly por seções transversais facetadas + detalhes "adesivados" na superfície.
   A versão anterior está guardada em "Carros 01.js". Frente do carro em -z. */
import {M} from './scene.js';
import {H,PB,PCy,UB,geo,haloArr,tm} from './geometry.js';
import * as RY7 from './models/ry7.js';

/* ---------- Carros importados (.glb convertido por tools/glb2car.mjs) ---------- */
const MODELS={ry7:RY7};
/* corpo e luzes a partir dos grupos de material; body = cor nova da lataria (opcional) */
function modelGeo(md,body){
  const P=[[],[],[]],Cc=[[],[],[]],tail=[[0,0,0,0],[0,0,0,0]];
  md.BODY.forEach(function(g){
    const m=md.MATS[g.mat],lit=m.role==='head'||m.role==='tail'||m.role==='signal',k=lit?1:0;
    const c=hexRGB(m.role==='body'&&body!==undefined?body:m.color);
    for(let i=0;i<g.pos.length;i+=3){
      const x=g.pos[i]/1000,y=g.pos[i+1]/1000,z=g.pos[i+2]/1000;
      P[k].push(x,y,z);Cc[k].push(c[0],c[1],c[2]);
      if(m.role==='tail'){const t=tail[x<0?0:1];t[0]+=x;t[1]+=y;t[2]+=z;t[3]++;}
    }
  });
  /* um brilho em cada lado, no centro das lanternas */
  const hl=tail.filter(t=>t[3]).map(t=>H(t[0]/t[3],t[1]/t[3],t[2]/t[3]+0.08,0.55,0xff2a1a));
  if(hl.length){const h=haloArr(hl);P[2]=h.P;Cc[2]=h.C;}
  return packArr(P,Cc);
}
/* roda do modelo: a esquerda vem pronta; a direita é espelhada (inverte o sentido das faces) */
function modelWheel(md,mirror){
  const P=[],Cc=[];
  md.WHEEL.forEach(function(g){
    const c=hexRGB(md.MATS[g.mat].color);
    for(let i=0;i<g.pos.length;i+=9){
      const tri=[0,1,2].map(n=>[g.pos[i+n*3]/1000*(mirror?-1:1),g.pos[i+n*3+1]/1000,g.pos[i+n*3+2]/1000]);
      (mirror?[0,2,1]:[0,1,2]).forEach(function(n){P.push(tri[n][0],tri[n][1],tri[n][2]);Cc.push(c[0],c[1],c[2]);});
    }
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));
  g.computeVertexNormals();return g;
}
function packArr(P,Cc){
  const n0=P[0].length,n1=P[1].length,n2=P[2].length,A=new Float32Array(n0+n1+n2),B=new Float32Array(n0+n1+n2);
  A.set(P[0]);A.set(P[1],n0);A.set(P[2],n0+n1);B.set(Cc[0]);B.set(Cc[1],n0);B.set(Cc[2],n0+n1);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(A,3));g.setAttribute('color',new THREE.BufferAttribute(B,3));
  g.computeVertexNormals();
  g.addGroup(0,n0/3,0);g.addGroup(n0/3,n1/3,1);if(n2)g.addGroup((n0+n1)/3,n2/3,2);
  return g;
}

/* ---------- Seção transversal ----------
   Cada estação (zn = posição de -0.5 a 0.5 do comprimento) tem: w meia-largura (fração de W), yb fundo, ys topo da lateral,
   deck linha de cintura/capô, roof teto (= deck onde não há cabine), rw meia-largura do teto (fração de W), crown abaulado.
   Meio perfil com 8 pontos, do centro de baixo ao centro de cima; segmentos:
   0 fundo, 1 saia, 2 lateral baixa, 3 ombro, 4 friso, 5 vidro lateral (ou capô), 6 teto (ou centro do capô). */
const K=['w','yb','ys','deck','roof','rw','crown'];
const cabOf=p=>p.roof>p.deck+0.04;
function prof(p,W){
  const w=p.w*W, cab=cabOf(p), gw=cab?w*0.88:w*0.84;
  return [[0,p.yb],[w-0.1,p.yb],[w,Math.min(p.yb+0.12,p.ys-0.02)],[w,p.ys],[w-0.035,p.deck-0.04],[gw,p.deck],
    cab?[p.rw*W,p.roof]:[w*0.52,p.deck+p.crown*0.6],[0,(cab?p.roof:p.deck)+p.crown]];
}
/* parâmetros numa posição z (interpolação linear: arestas vivas, visual low poly) */
function paramsAt(s,z){
  const st=s.st,zn=z/s.L;
  let k=0;while(k<st.length-2&&zn>st[k+1][0])k++;
  const a=st[k],b=st[k+1],t=Math.min(1,Math.max(0,(zn-a[0])/(b[0]-a[0]))),p={};
  K.forEach(function(key,n){p[key]=a[n+1]+(b[n+1]-a[n+1])*t;});
  return p;
}
/* recorte dos para-lamas: só a borda de baixo da lateral sobe em arco sobre cada roda.
   A lateral (ys) e o capô nunca se mexem: o desenho de cada carro deixa o para-lama acima do arco.
   Rodas que ficam fora da carroceria (caminhão atrás da cabine) não recortam nada. */
function archAt(s,z,p){
  const Ra=s.r*1.22, top=2*s.r+0.04, wx=s.W*0.93-s.ww;
  s.wz.forEach(function(zc){
    const dz=Math.abs(z-zc);
    if(dz<Ra&&p.w*s.W>wx){const y=Math.min(top,p.ys-0.06)*Math.sqrt(1-(dz/Ra)*(dz/Ra));if(y>p.yb)p.yb=y;}
  });
  return p;
}
const hexRGB=h=>[((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255];
/* mesma cor, mais escura (k<1): peças que acompanham a lataria em outro tom */
const shade=(h,k)=>{const c=hexRGB(h);return (Math.round(c[0]*k*255)<<16)|(Math.round(c[1]*k*255)<<8)|Math.round(c[2]*k*255);};
const GLASS=0x1d2a44, GLASS_HI=0x2c4166, UNDER=0x111116;

/* ---------- Montagem ---------- */
function build(s){
  const L=s.L,W=s.W,body=[],light=[],halos=[];
  const C=s.c, ROOF=s.roof!==undefined?s.roof:C, TRIM=s.trim!==undefined?s.trim:0x1a1b20;
  /* estações: as do desenho + as que contornam os arcos das rodas */
  let zs=s.st.map(r=>r[0]*L);
  s.wz.forEach(function(zc){[-1,-0.85,-0.6,-0.3,0,0.3,0.6,0.85,1].forEach(function(f){zs.push(zc+f*s.r*1.25);});});
  (s.pillars||[]).forEach(function(r){zs.push(r[0]*L,r[1]*L);});   /* colunas das janelas com bordas próprias */
  zs=zs.filter(z=>z>=-L/2-1e-6&&z<=L/2+1e-6).sort((a,b)=>a-b);
  const Z=[zs[0]];zs.forEach(function(z){if(z-Z[Z.length-1]>0.02)Z.push(z);});
  const PR=Z.map(function(z){const p=archAt(s,z,paramsAt(s,z));return {z:z,p:p,pts:prof(p,W),cab:cabOf(p)};});
  const pil=zm=>(s.pillars||[]).some(r=>zm>=r[0]*L&&zm<=r[1]*L);
  const tri=(arr,a,b,c,col)=>{arr.push({v:[a,b,c],c:col});};
  /* casca: quads entre estações vizinhas, espelhados nos dois lados */
  for(let i=0;i<PR.length-1;i++){
    const A=PR[i],B=PR[i+1],zm=(A.z+B.z)/2;
    for(let g=0;g<7;g++){
      let col;
      if(g===0)col=UNDER;
      else if(g===1)col=TRIM;
      else if(g===5){
        if(A.cab&&B.cab)col=pil(zm)?(s.pillarC!==undefined?s.pillarC:ROOF):GLASS;
        else if(A.cab!==B.cab)col=s.pillarC!==undefined?s.pillarC:ROOF;
        else col=C;
      }else if(g===6){
        if(A.cab!==B.cab)col=GLASS_HI;
        else col=A.cab?ROOF:C;
      }else col=C;
      if(s.paint){const o=s.paint(zm/L,g,A.cab&&B.cab);if(o!==null&&o!==undefined)col=o;}
      [-1,1].forEach(function(sd){
        const a=[sd*A.pts[g][0],A.pts[g][1],A.z],b=[sd*A.pts[g+1][0],A.pts[g+1][1],A.z];
        const c=[sd*B.pts[g+1][0],B.pts[g+1][1],B.z],d=[sd*B.pts[g][0],B.pts[g][1],B.z];
        /* o lado espelhado inverte o sentido das faces para a normal continuar para fora */
        if(sd>0){tri(body,a,b,c,col);tri(body,a,c,d,col);}else{tri(body,a,c,b,col);tri(body,a,d,c,col);}
      });
    }
  }
  /* tampas da frente e de trás */
  [[PR[0],-1],[PR[PR.length-1],1]].forEach(function(e){
    const R=e[0],cy=(R.p.yb+R.p.deck)/2;
    for(let g=0;g<7;g++)[-1,1].forEach(function(sd){
      const o=[0,cy,R.z],p=[sd*R.pts[g][0],R.pts[g][1],R.z],q=[sd*R.pts[g+1][0],R.pts[g+1][1],R.z];
      if(sd*e[1]>0)tri(body,o,p,q,g===0?UNDER:C);else tri(body,o,q,p,g===0?UNDER:C);
    });
  });
  /* ponto e normal na superfície: u de 0 (fundo) a 7 (centro do teto) */
  const surf=function(z,u,sd){
    const p=archAt(s,z,paramsAt(s,z)),pts=prof(p,W),k=Math.min(6,Math.max(0,Math.floor(u))),t=u-k;
    return [sd*(pts[k][0]+(pts[k+1][0]-pts[k][0])*t),pts[k][1]+(pts[k+1][1]-pts[k][1])*t,z];
  };
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const nrm=function(z,u,sd){
    const e=0.02,dz=sub(surf(z+e,u,sd),surf(z-e,u,sd)),du=sub(surf(z,u+e,sd),surf(z,u-e,sd));
    let n=crs(du,dz);const P=surf(z,u,sd),out=[P[0],P[1]-0.6,0];
    if(n[0]*out[0]+n[1]*out[1]+n[2]*out[2]<0)n=[-n[0],-n[1],-n[2]];
    const l=Math.hypot(n[0],n[1],n[2])||1;return [n[0]/l,n[1]/l,n[2]/l];
  };
  const k={c:C,L:L,W:W,zf:PR[0].z,zr:PR[PR.length-1].z,front:PR[0].p,rear:PR[PR.length-1].p,at:z=>archAt(s,z,paramsAt(s,z)),
    /* adesivo na lateral: entre z0 e z1 (fração do comprimento) e u0..u1 do perfil, nos dois lados */
    side:function(z0,z1,u0,u1,col,o){
      o=o||{};const arr=o.L?light:body,nz=o.nz||3,nu=Math.max(1,Math.ceil((u1-u0)*3)),off=o.off||0.012;
      (o.sd?[o.sd]:[-1,1]).forEach(function(sd){
        const G=[];
        for(let a=0;a<=nz;a++){const row=[];for(let b=0;b<=nu;b++){
          const z=(z0+(z1-z0)*a/nz)*L,u=u0+(u1-u0)*b/nu,P=surf(z,u,sd),n=nrm(z,u,sd);
          row.push([P[0]+n[0]*off,P[1]+n[1]*off,P[2]+n[2]*off]);}G.push(row);}
        for(let a=0;a<nz;a++)for(let b=0;b<nu;b++){
          if(sd>0){tri(arr,G[a][b],G[a][b+1],G[a+1][b+1],col);tri(arr,G[a][b],G[a+1][b+1],G[a+1][b],col);}
          else{tri(arr,G[a][b],G[a+1][b+1],G[a][b+1],col);tri(arr,G[a][b],G[a+1][b],G[a+1][b+1],col);}
        }
      });
    },
    /* adesivo na tampa (frente: f=-1, traseira: f=1): polígono convexo em (x,y), espelhado se mirror */
    cap:function(f,poly,col,o){
      o=o||{};const arr=o.L?light:body,z=(f<0?PR[0].z:PR[PR.length-1].z)+f*(0.012+(o.lift||0));
      (o.mirror?[-1,1]:[1]).forEach(function(sd){
        let P=poly.map(q=>[q[0]*sd,q[1],z]);let cx=0,cy=0,ar=0;P.forEach(q=>{cx+=q[0];cy+=q[1];});cx/=P.length;cy/=P.length;
        /* a face tem de olhar para fora: para -z na frente, +z atrás */
        for(let n=0;n<P.length;n++){const a=P[n],b=P[(n+1)%P.length];ar+=a[0]*b[1]-b[0]*a[1];}
        if(ar*f<0)P=P.reverse();
        for(let n=0;n<P.length;n++)tri(arr,[cx,cy,z],P[n],P[(n+1)%P.length],col);
        if(o.halo)halos.push(H(cx,cy,z+f*0.05,o.halo,0xff2a1a));
      });
    },
    parts:[], lights:[]
  };
  if(s.detail)s.detail(k);
  return {body:body,light:light,halos:halos,parts:k.parts,lparts:k.lights,k:k};
}
/* formas para as tampas */
const rect=(cx,cy,w,h,r)=>{r=r||0;const c=Math.cos(r),s=Math.sin(r);return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(p=>[cx+p[0]*c-p[1]*s,cy+p[0]*s+p[1]*c]);};
const circ=(cx,cy,r,n)=>{const o=[];n=n||14;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return o;};
const oval=(cx,cy,rx,ry,n)=>{const o=[];n=n||14;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;o.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return o;};
const trap=(cx,cy,wb,wt,h)=>[[cx-wb/2,cy-h/2],[cx+wb/2,cy-h/2],[cx+wt/2,cy+h/2],[cx-wt/2,cy+h/2]];
const hex=(cx,cy,r)=>circ(cx,cy,r,6);
const capY=(p,f)=>p.yb+(p.deck-p.yb)*f;

const CHROME=0xd2d6dc,BLACK=0x0c0c10,DARK=0x1b1d24,HEAD=0xfff3c4,TAIL=0xff2d2d,AMBER=0xffa21a,LED=0xeaf6ff;
/* placa Mercosul: branca com faixa azul */
function plate(k,f,y){k.cap(f,rect(0,y,0.52,0.14),0xf4f4f0,{lift:0.004});k.cap(f,rect(0,y+0.05,0.52,0.035),0x1f4fb4,{lift:0.008});}
/* retrovisor: caixa presa à porta, logo atrás da base do para-brisa */
function mirrors(k,zn,col){
  const z=zn*k.L,p=k.at(z),x=p.w*k.W*0.86+0.1;
  [-1,1].forEach(function(sd){k.parts.push({g:UB,m:tm(sd*x,p.deck+0.1,z,0.2,0.12,0.14,0,0,0),c:col},{g:UB,m:tm(sd*(x-0.09),p.deck+0.05,z+0.02,0.08,0.05,0.06),c:DARK});});
}
/* asa traseira: dois suportes e o aerofólio */
function wing(k,zn,h,w,d,col,ux){
  const z=zn*k.L,p=k.at(z),y=p.deck+p.crown;
  [-1,1].forEach(function(sd){k.parts.push({g:UB,m:tm(sd*ux,y+h/2,z,0.06,h,0.16),c:col});});
  k.parts.push({g:UB,m:tm(0,y+h+0.03,z,w,0.05,d,-0.08,0,0),c:col},{g:UB,m:tm(-w/2,y+h,z,0.04,0.16,d+0.04),c:col},{g:UB,m:tm(w/2,y+h,z,0.04,0.16,d+0.04),c:col});
}
function exhaust(k,x,y,r,seg){[-1,1].forEach(function(sd){if(sd<0&&x===0)return;k.parts.push({g:new THREE.CylinderGeometry(r,r,0.18,seg||10),m:tm(sd*x,y,k.zr+0.04,1,1,1,Math.PI/2,0,0),c:0x9aa0aa},{g:new THREE.CylinderGeometry(r*0.7,r*0.7,0.2,seg||10),m:tm(sd*x,y,k.zr+0.05,1,1,1,Math.PI/2,0,0),c:BLACK});});}

/* ---------- Rodas: pneu, aro com o desenho do carro e pinça de freio ---------- */
function wheelGeo(r,w,style,rim){
  const p=[PCy(r,r,w,14,0,0,0,0x16161b,0,0,Math.PI/2),PCy(r*0.9,r*0.9,w+0.012,14,0,0,0,0x22232a,0,0,Math.PI/2),
    PCy(r*0.7,r*0.7,w+0.02,14,0,0,0,rim===undefined?0xc9ced6:rim,0,0,Math.PI/2),PCy(r*0.58,r*0.58,w+0.03,12,0,0,0,0x2a2c34,0,0,Math.PI/2)];
  const sp=style==='mesh'?10:(style==='dish'?0:5), rc=rim===undefined?0xe3e7ec:rim;
  for(let k=0;k<sp;k++)p.push({g:UB,m:tm(0,0,0,w+0.04,r*1.2,style==='mesh'?r*0.07:r*0.16,k*Math.PI/sp,0,0),c:rc});
  if(style==='dish')p.push(PCy(r*0.5,r*0.38,w+0.07,12,0,0,0,0xf0f2f4,0,0,Math.PI/2));
  p.push(PCy(r*0.17,r*0.17,w+0.06,8,0,0,0,0x3a3c44,0,0,Math.PI/2));
  return geo(p);
}
function wheelsOf(s){
  const x=s.W*0.93-s.ww/2,out=[];
  s.wz.forEach(function(z){out.push({x:x,z:z,front:z<0});});
  return out;
}

/* ---------- Geometria final: grupos [corpo, luzes, brilho] ---------- */
function toArr(list){
  const P=[],Cc=[];
  list.forEach(function(t){const c=hexRGB(t.c);t.v.forEach(function(v){P.push(v[0],v[1],v[2]);Cc.push(c[0],c[1],c[2]);});});
  return {P:P,C:Cc};
}
function vehGeo(s,baked){
  const b=build(s),A=toArr(b.body),Lt=toArr(b.light);
  const parts=b.parts.slice();
  if(baked)wheelsOf(s).forEach(function(w){[-1,1].forEach(function(sd){
    parts.push(PCy(s.r,s.r,s.ww,12,sd*w.x,s.r,w.z,0x16161b,0,0,Math.PI/2),PCy(s.r*0.65,s.r*0.65,s.ww+0.02,10,sd*w.x,s.r,w.z,0xc9ced6,0,0,Math.PI/2));});});
  if(s.caliper)wheelsOf(s).forEach(function(w){[-1,1].forEach(function(sd){parts.push({g:UB,m:tm(sd*(w.x-0.02),s.r+s.r*0.32,w.z-s.r*0.25,s.ww*0.6,s.r*0.34,s.r*0.4,0.5,0,0),c:s.caliper});});});
  const pg=parts.length?geo(parts):null, lg=b.lparts.length?geo(b.lparts):null;
  const h=b.halos.length?haloArr(b.halos):{P:[],C:[]};
  const g0P=A.P.concat(pg?Array.from(pg.attributes.position.array):[]), g0C=A.C.concat(pg?Array.from(pg.attributes.color.array):[]);
  const g1P=Lt.P.concat(lg?Array.from(lg.attributes.position.array):[]), g1C=Lt.C.concat(lg?Array.from(lg.attributes.color.array):[]);
  const P=new Float32Array(g0P.length+g1P.length+h.P.length),Cc=new Float32Array(P.length);
  P.set(g0P);P.set(g1P,g0P.length);P.set(h.P,g0P.length+g1P.length);
  Cc.set(g0C);Cc.set(g1C,g0C.length);Cc.set(h.C,g0C.length+g1C.length);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(Cc,3));
  g.computeVertexNormals();
  g.addGroup(0,g0P.length/3,0);g.addGroup(g0P.length/3,g1P.length/3,1);if(h.P.length)g.addGroup((g0P.length+g1P.length)/3,h.P.length/3,2);
  if(pg)pg.dispose();if(lg)lg.dispose();
  return g;
}

/* ================= Carros do jogador ================= */
/* estações: [zn, w, yb, ys, deck, roof, rw, crown] */
const CARSPEC={
  /* Fiat 500: bolha alta de teto branco, frente curta com faróis redondos e o "bigode" cromado */
  pulga:{L:3.55,W:0.84,r:0.29,roofPaint:true,ww:0.2,wz:[-1.12,1.08],c:0xffc24a,roof:0xf4f1ea,pillarC:0xf4f1ea,rimStyle:'dish',
    st:[[-0.5,0.74,0.26,0.52,0.62,0.62,0.42,0.02],[-0.46,0.88,0.2,0.6,0.72,0.72,0.5,0.03],[-0.38,0.95,0.18,0.68,0.8,0.8,0.55,0.03],[-0.24,0.98,0.18,0.7,0.84,0.84,0.6,0.03],[-0.12,1,0.18,0.72,0.87,1.4,0.72,0.05],[0.2,1,0.18,0.72,0.87,1.47,0.74,0.05],[0.36,0.97,0.18,0.72,0.87,1.36,0.66,0.04],[0.45,0.93,0.2,0.7,0.85,0.85,0.55,0.03],[0.5,0.84,0.28,0.62,0.76,0.76,0.45,0.02]],
    pillars:[[0.04,0.08]],
    detail:function(k){
      const f=k.front,r=k.rear,yh=capY(f,0.62);
      [-1,1].forEach(function(sd){
        k.cap(-1,circ(sd*0.36,yh,0.15),CHROME);k.cap(-1,circ(sd*0.36,yh,0.12),HEAD,{L:true,lift:0.004});
        k.cap(-1,circ(sd*0.36,yh-0.2,0.045),AMBER,{L:true});
        k.cap(1,rect(sd*0.5,capY(r,0.62),0.14,0.24),TAIL,{L:true,halo:0.4});
      });
      k.cap(-1,rect(0,yh-0.02,0.4,0.035),CHROME,{lift:0.004});k.cap(-1,circ(0,yh-0.02,0.06),0xc8102e,{lift:0.008});
      k.cap(-1,trap(0,capY(f,0.18),0.62,0.5,0.1),BLACK);
      k.cap(1,rect(0,capY(r,0.5),0.8,0.035),CHROME);plate(k,-1,capY(f,0.3));plate(k,1,capY(r,0.3));
      k.side(-0.06,0.3,4.2,4.8,CHROME,{nz:4});   /* friso cromado da janela */
      mirrors(k,-0.08,k.c);
    }},
  /* Lancer Evolution X: sedã bravo, grade trapezoidal preta enorme com os três losangos, asa alta */
  gt:{L:4.5,W:0.93,r:0.33,ww:0.25,wz:[-1.38,1.32],c:0xe84a3a,pillarC:0x15161c,rimStyle:'y5',rim:0x2f3138,caliper:0xd8263a,
    st:[[-0.5,0.82,0.24,0.5,0.64,0.64,0.5,0],[-0.46,0.93,0.2,0.62,0.76,0.76,0.55,0.01],[-0.36,0.99,0.18,0.76,0.86,0.86,0.6,-0.01],[-0.17,1,0.18,0.78,0.92,0.92,0.62,0.02],[-0.04,1,0.18,0.78,0.93,1.45,0.72,0.05],[0.16,1,0.18,0.78,0.93,1.45,0.72,0.05],[0.28,1,0.18,0.79,0.95,1,0.7,0.02],[0.46,0.98,0.2,0.78,0.96,0.97,0.6,0.01],[0.5,0.92,0.26,0.7,0.92,0.92,0.55,0]],
    pillars:[[0.05,0.08]],
    detail:function(k){
      const f=k.front,r=k.rear;
      k.cap(-1,trap(0,capY(f,0.42),1.05,1.3,0.32),BLACK);k.cap(-1,trap(0,capY(f,0.1),1.2,1.1,0.12),BLACK);
      [[0,0.06],[-0.052,-0.03],[0.052,-0.03]].forEach(function(q,n){k.cap(-1,rect(q[0],capY(f,0.42)+q[1],0.05,0.085,[0,2.09,-2.09][n]),0xd0102a,{lift:0.004});});
      [-1,1].forEach(function(sd){
        k.cap(-1,trap(sd*0.58,capY(f,0.78),0.34,0.42,0.09),HEAD,{L:true});k.cap(-1,circ(sd*0.64,capY(f,0.1),0.05),HEAD,{L:true,lift:0.004});
        k.cap(1,trap(sd*0.55,capY(r,0.72),0.5,0.42,0.12),TAIL,{L:true,halo:0.55});
      });
      k.cap(1,rect(0,capY(r,0.12),1.3,0.1),BLACK);plate(k,1,capY(r,0.4));
      k.side(-0.34,-0.24,5.2,6.2,0x15161c,{nz:2});   /* saídas de ar no capô */
      for(let n=0;n<5;n++)k.parts.push({g:UB,m:tm((n-2)*0.13,k.at(0.13*k.L).roof+0.04,0.13*k.L,0.025,0.08,0.14),c:0x15161c});
      mirrors(k,-0.13,k.c);wing(k,0.45,0.3,1.7,0.36,0x15161c,0.52);exhaust(k,0.55,0.3,0.06);
    }},
  /* Mazda RX-7 FD: baixo e curvilíneo, faróis escamoteáveis fechados, boca oval, painel traseiro fumê com lanternas redondas */
  cupe:{L:4.3,W:0.88,r:0.32,ww:0.25,wz:[-1.3,1.28],c:0x2ec4b6,pillarC:0x15161c,rimStyle:'y5',
    st:[[-0.5,0.72,0.2,0.4,0.48,0.48,0.45,0],[-0.45,0.88,0.17,0.54,0.62,0.62,0.5,0],[-0.33,0.97,0.16,0.74,0.8,0.8,0.5,-0.08],[-0.2,1,0.16,0.74,0.8,0.8,0.55,-0.05],[-0.1,1,0.16,0.72,0.8,0.8,0.55,0],[0,1,0.16,0.7,0.8,1.22,0.58,0.04],[0.14,1,0.16,0.72,0.82,1.24,0.6,0.04],[0.3,1,0.16,0.76,0.86,1.06,0.56,0.03],[0.4,1,0.17,0.76,0.88,0.94,0.56,0.02],[0.46,0.98,0.2,0.72,0.86,0.86,0.6,0.02],[0.5,0.9,0.26,0.62,0.82,0.82,0.55,0]],
    detail:function(k){
      const f=k.front,r=k.rear;
      k.cap(-1,oval(0,capY(f,0.36),0.42,0.07),BLACK);
      [-1,1].forEach(function(sd){
        k.cap(-1,circ(sd*0.5,capY(f,0.62),0.045),AMBER,{L:true});
        k.cap(1,circ(sd*0.36,capY(r,0.62),0.07),TAIL,{L:true,lift:0.006,halo:0.35});k.cap(1,circ(sd*0.6,capY(r,0.62),0.07),TAIL,{L:true,lift:0.006,halo:0.35});
      });
      k.cap(1,rect(0,capY(r,0.62),1.45,0.17),0x1a0c10);plate(k,1,capY(r,0.3));
      k.side(-0.44,-0.33,5.1,5.9,shade(k.c,0.88),{nz:2});   /* tampas dos faróis escamoteáveis */
      k.side(-0.44,-0.42,5.2,5.8,0x15161c,{nz:1});
      mirrors(k,-0.04,k.c);wing(k,0.46,0.08,1.4,0.26,k.c,0.6);exhaust(k,0.45,0.28,0.06);
    }},
  /* Toyota Supra MK4: capô longo, faróis de três lentes, boca grande, quatro lanternas redondas e a asa em arco */
  muscle:{L:4.5,W:0.95,r:0.34,ww:0.27,wz:[-1.38,1.36],c:0x7c6cf0,pillarC:0x15161c,rimStyle:'y5',
    st:[[-0.5,0.78,0.2,0.42,0.52,0.52,0.5,0],[-0.45,0.92,0.17,0.56,0.66,0.66,0.55,0],[-0.33,0.98,0.16,0.78,0.84,0.84,0.58,-0.07],[-0.18,1,0.16,0.78,0.84,0.84,0.6,-0.03],[-0.06,1,0.16,0.76,0.85,0.85,0.6,0.02],[0.04,1,0.16,0.76,0.86,1.27,0.62,0.05],[0.2,1,0.16,0.78,0.88,1.26,0.62,0.05],[0.32,1,0.16,0.8,0.92,0.96,0.6,0.02],[0.46,0.98,0.2,0.78,0.94,0.94,0.6,0.01],[0.5,0.9,0.26,0.66,0.9,0.9,0.55,0]],
    detail:function(k){
      const f=k.front,r=k.rear;
      k.cap(-1,oval(0,capY(f,0.28),0.48,0.1),BLACK);k.cap(-1,rect(0,capY(f,0.6),0.36,0.04),BLACK);
      [-1,1].forEach(function(sd){
        k.cap(-1,oval(sd*0.5,capY(f,0.74),0.22,0.07),DARK);
        k.cap(-1,circ(sd*0.62,capY(f,0.74),0.05),HEAD,{L:true,lift:0.004});k.cap(-1,circ(sd*0.5,capY(f,0.74),0.04),HEAD,{L:true,lift:0.004});k.cap(-1,circ(sd*0.38,capY(f,0.74),0.035),AMBER,{L:true,lift:0.004});
        k.cap(1,circ(sd*0.32,capY(r,0.66),0.1),TAIL,{L:true,halo:0.4});k.cap(1,circ(sd*0.6,capY(r,0.66),0.1),TAIL,{L:true,halo:0.4});
      });
      k.cap(1,oval(0,capY(r,0.66),0.07,0.045),CHROME);plate(k,1,capY(r,0.36));
      mirrors(k,0.0,k.c);wing(k,0.45,0.42,1.85,0.4,shade(k.c,0.6),0.62);exhaust(k,0.4,0.3,0.07);
    }},
  /* Audi R8: cabine adiantada, lâmina lateral em cor contrastante, grade Singleframe e as quatro argolas */
  veloce:{L:4.45,W:0.97,r:0.34,ww:0.28,wz:[-1.36,1.36],c:0xf4f1ea,pillarC:0x15161c,rimStyle:'mesh',caliper:0xd8263a,
    st:[[-0.5,0.78,0.18,0.4,0.5,0.5,0.5,0],[-0.45,0.92,0.15,0.56,0.64,0.64,0.55,0],[-0.33,0.98,0.14,0.78,0.84,0.84,0.55,-0.08],[-0.2,1,0.14,0.76,0.82,0.82,0.58,-0.02],[-0.08,1,0.14,0.74,0.82,1.2,0.62,0.05],[0.12,1,0.14,0.74,0.84,1.22,0.62,0.05],[0.3,1,0.14,0.8,0.92,0.98,0.6,0.03],[0.46,0.98,0.16,0.78,0.92,0.92,0.6,0.01],[0.5,0.92,0.22,0.66,0.88,0.88,0.55,0]],
    detail:function(k){
      const f=k.front,r=k.rear,yg=capY(f,0.5);
      k.cap(-1,hex(0,yg,0.125).map(p=>[p[0]*2.2,p[1]]),CHROME);k.cap(-1,hex(0,yg,0.105).map(p=>[p[0]*2.25,p[1]]),BLACK,{lift:0.004});
      for(let n=0;n<4;n++){const x=(n-1.5)*0.062;k.cap(-1,circ(x,yg+0.035,0.036),CHROME,{lift:0.008});k.cap(-1,circ(x,yg+0.035,0.024),BLACK,{lift:0.012});}
      [-1,1].forEach(function(sd){
        k.cap(-1,trap(sd*0.6,capY(f,0.72),0.36,0.3,0.1),DARK);k.cap(-1,rect(sd*0.6,capY(f,0.68),0.34,0.025,sd*0.08),LED,{L:true,lift:0.004});
        k.cap(-1,trap(sd*0.62,capY(f,0.22),0.28,0.34,0.14),BLACK);
        k.cap(1,rect(sd*0.56,capY(r,0.72),0.5,0.06),TAIL,{L:true,halo:0.5});
        k.cap(1,oval(sd*0.5,capY(r,0.2),0.09,0.06),BLACK,{lift:0.004});
      });
      k.cap(1,rect(0,capY(r,0.44),1.4,0.16),0x18191f);plate(k,1,capY(r,0.62));
      k.side(-0.02,0.2,2.1,3.6,0x22232b,{nz:4});   /* lâmina lateral */
      mirrors(k,-0.13,0x22232b);
    }},
  /* Lamborghini Aventador: cunha baixíssima, para-brisa contínuo, faróis e lanternas em Y, tomadas de ar e escape hexagonal */
  hiper:{L:4.8,W:1.02,r:0.35,ww:0.3,wz:[-1.46,1.46],c:0xffd23f,pillarC:0x15161c,rimStyle:'y5',rim:0x2a2c34,caliper:0xffd23f,
    st:[[-0.5,0.78,0.16,0.3,0.38,0.38,0.5,0],[-0.44,0.92,0.14,0.46,0.54,0.54,0.55,0],[-0.33,0.98,0.13,0.8,0.84,0.84,0.58,-0.14],[-0.22,1,0.13,0.78,0.84,0.84,0.6,-0.08],[-0.14,1,0.13,0.72,0.8,0.8,0.6,0],[0,1,0.13,0.7,0.8,1.12,0.6,0.03],[0.14,1,0.13,0.72,0.82,1.13,0.58,0.03],[0.3,1,0.13,0.82,0.9,0.94,0.6,0.01],[0.46,0.99,0.14,0.8,0.9,0.9,0.6,0],[0.5,0.93,0.2,0.66,0.86,0.86,0.55,0]],
    detail:function(k){
      const f=k.front,r=k.rear;
      [-1,1].forEach(function(sd){
        /* Y: haste e dois braços */
        const yh=capY(f,0.6),yt=capY(r,0.66);
        k.cap(-1,rect(sd*0.5,yh,0.2,0.035),HEAD,{L:true});k.cap(-1,rect(sd*0.63,yh+0.04,0.14,0.03,sd*0.6),HEAD,{L:true});k.cap(-1,rect(sd*0.63,yh-0.04,0.14,0.03,-sd*0.6),HEAD,{L:true});
        k.cap(1,rect(sd*0.5,yt,0.22,0.04),TAIL,{L:true,halo:0.4});k.cap(1,rect(sd*0.65,yt+0.05,0.16,0.035,sd*0.6),TAIL,{L:true});k.cap(1,rect(sd*0.65,yt-0.05,0.16,0.035,-sd*0.6),TAIL,{L:true});
        k.cap(-1,trap(sd*0.55,capY(f,0.2),0.5,0.3,0.12),BLACK);
      });
      k.cap(1,rect(0,capY(r,0.25),1.5,0.14),BLACK);k.cap(1,hex(0,capY(r,0.3),0.11),0x2a2c34,{lift:0.004});k.cap(1,hex(0,capY(r,0.3),0.08),BLACK,{lift:0.008});
      plate(k,1,capY(r,0.55));
      k.side(0.1,0.26,2.6,3.9,BLACK,{nz:3});   /* tomada de ar lateral */
      for(let n=0;n<4;n++)k.side(0.32+n*0.03,0.335+n*0.03,5.4,6.8,0x15161c,{nz:1});
      mirrors(k,-0.09,0x15161c);wing(k,0.46,0.18,1.6,0.3,0x15161c,0.55);
    }}
};
/* ================= Trânsito ================= */
const TRAFFIC={
  /* sedã popular de três volumes */
  sedan:function(c){return {L:4.5,W:0.9,r:0.31,ww:0.22,wz:[-1.36,1.34],c:c,pillarC:0x1b1d24,
    st:[[-0.5,0.84,0.24,0.5,0.66,0.66,0.5,0],[-0.46,0.95,0.2,0.62,0.76,0.76,0.55,0.02],[-0.32,0.99,0.18,0.74,0.84,0.84,0.6,0.02],[-0.16,1,0.18,0.74,0.9,0.9,0.62,0.03],[-0.03,1,0.18,0.74,0.92,1.45,0.74,0.05],[0.17,1,0.18,0.74,0.92,1.45,0.74,0.05],[0.29,1,0.18,0.75,0.93,1,0.7,0.03],[0.46,0.98,0.2,0.74,0.94,0.96,0.6,0.02],[0.5,0.92,0.28,0.66,0.92,0.92,0.55,0]],
    pillars:[[0.06,0.09]],
    detail:function(k){
      const f=k.front,r=k.rear;
      k.cap(-1,rect(0,capY(f,0.6),0.8,0.12),BLACK);k.cap(-1,rect(0,capY(f,0.64),0.8,0.025),CHROME,{lift:0.004});k.cap(-1,circ(0,capY(f,0.6),0.05),CHROME,{lift:0.008});
      [-1,1].forEach(function(sd){k.cap(-1,trap(sd*0.6,capY(f,0.68),0.3,0.36,0.11),HEAD,{L:true});k.cap(1,rect(sd*0.6,capY(r,0.7),0.42,0.12),TAIL,{L:true,halo:0.5});});
      plate(k,-1,capY(f,0.25));plate(k,1,capY(r,0.4));mirrors(k,-0.11,c);
    }};},
  /* Kombi: frente chata em duas cores com o "V", o círculo grande, para-brisa bipartido e faróis redondos */
  van:function(c,st){return {L:4.5,W:0.95,r:0.33,ww:0.22,wz:[-1.25,1.25],c:c,roof:st,pillarC:st,
    st:[[-0.5,0.93,0.3,0.8,1.05,1.88,0.82,0.04],[-0.47,0.98,0.28,0.85,1.1,1.95,0.86,0.05],[0.46,0.98,0.28,0.85,1.1,1.95,0.86,0.05],[0.5,0.93,0.32,0.8,1.05,1.9,0.82,0.04]],
    pillars:[[-0.47,-0.43],[-0.05,-0.02],[0.25,0.28],[0.43,0.5]],
    paint:function(zn,g){return g>=3&&g<=4?st:null;},
    detail:function(k){
      const f=k.front;
      /* duas cores: metade de cima clara; o "V" desce até o círculo */
      k.cap(-1,rect(0,1.46,1.58,0.82),st);
      k.cap(-1,rect(-0.36,1.48,0.66,0.5),GLASS,{lift:0.004});k.cap(-1,rect(0.36,1.48,0.66,0.5),GLASS,{lift:0.004});
      [-1,1].forEach(function(sd){k.cap(-1,rect(sd*0.4,1.0,0.9,0.18,-sd*0.42),st,{lift:0.002});
        k.cap(-1,circ(sd*0.66,0.78,0.13),CHROME,{lift:0.002});k.cap(-1,circ(sd*0.66,0.78,0.1),HEAD,{L:true,lift:0.006});
        k.cap(-1,circ(sd*0.66,1.02,0.04),AMBER,{L:true});k.cap(1,rect(sd*0.78,0.9,0.12,0.22),TAIL,{L:true,halo:0.35});});
      k.cap(-1,circ(0,0.86,0.2),st,{lift:0.004});k.cap(-1,circ(0,0.86,0.15),c,{lift:0.008});
      k.cap(-1,rect(-0.035,0.86,0.04,0.2,0.35),st,{lift:0.012});k.cap(-1,rect(0.035,0.86,0.04,0.2,-0.35),st,{lift:0.012});
      k.cap(-1,rect(0,0.44,1.8,0.1),CHROME,{lift:0.01});plate(k,-1,0.6);plate(k,1,0.62);
      mirrors(k,-0.45,st);
    }};},
  /* caminhão: cabine com grade cromada, chassi e baú */
  truck:function(cargo,cab,stripe){return {L:7.0,W:1.2,r:0.5,ww:0.38,wz:[-2.4,0.9,2.2],c:cab,trim:0x1e2028,
    st:[[-0.5,0.94,0.55,1.3,1.45,2.75,0.88,0.03],[-0.48,0.98,0.52,1.35,1.5,2.8,0.9,0.04],[-0.26,0.98,0.52,1.35,1.5,2.8,0.9,0.04],
      [-0.25,0.52,0.6,0.85,0.95,0.95,0.4,0],[0.5,0.52,0.6,0.85,0.95,0.95,0.4,0]],
    pillars:[[-0.37,-0.26]],
    paint:function(zn,g){if(zn>-0.262&&zn<-0.248)return cab;return zn>-0.25&&g>=2?0x1e2028:null;},
    detail:function(k){
      k.cap(-1,rect(0,2.1,2.0,0.75),GLASS,{lift:0.002});k.cap(-1,rect(0,2.1,0.06,0.75),cab,{lift:0.006});
      k.cap(-1,rect(0,1.05,1.4,0.6),0x2a2c33);for(let n=0;n<5;n++)k.cap(-1,rect(0,0.82+n*0.12,1.4,0.04),CHROME,{lift:0.004});
      [-1,1].forEach(function(sd){k.cap(-1,rect(sd*0.92,0.95,0.32,0.2),HEAD,{L:true});});
      k.cap(-1,rect(0,0.55,2.3,0.24),0x3a3d46,{lift:0.002});plate(k,-1,0.72);
      const zc=0.95;
      k.parts.push({g:UB,m:tm(0,2.4,zc,2.5,2.5,4.8),c:cargo},{g:UB,m:tm(0,3.5,zc,2.52,0.3,4.82),c:stripe},{g:UB,m:tm(0,3.0,-1.78,2.1,0.6,0.5),c:cab});
      [-1,1].forEach(function(sd){k.parts.push({g:UB,m:tm(sd*1.36,1.85,-3.0,0.12,0.42,0.12),c:0x15161c});});
      k.lights.push({g:UB,m:tm(-0.9,0.9,3.36,0.4,0.22,0.05),c:TAIL},{g:UB,m:tm(0.9,0.9,3.36,0.4,0.22,0.05),c:TAIL});
    }};}
};

/* ================= Interface usada pelo jogo ================= */
export const sedanGeo=c=>vehGeo(TRAFFIC.sedan(c),true);
export const vanGeo=(c,st)=>vehGeo(TRAFFIC.van(c,st),true);
export const truckGeo=(cargo,cab,stripe)=>vehGeo(TRAFFIC.truck(cargo,cab,stripe),true);
export const CARS=[
  {id:'pulga',name:'Pulga',price:0,accel:12,vmax:52},
  {id:'gt',name:'Evo R',price:400,accel:16,vmax:60},
  {id:'ry7',name:'RY 7',price:800,accel:18,vmax:64},
  {id:'cupe',name:'Rotor 7',price:1200,accel:19,vmax:66},
  {id:'muscle',name:'Mark IV',price:2500,accel:26,vmax:64},
  {id:'veloce',name:'Quattro V10',price:5000,accel:21,vmax:74},
  {id:'hiper',name:'Touro X',price:9000,accel:24,vmax:84}
];
/* RY 7: modelo importado (Mazda RX7 Stylised, de SheldonJ99, CC-BY 4.0) */
CARSPEC.ry7={model:'ry7',c:0xf4f4f4};
CARS.forEach(function(c){c.c=CARSPEC[c.id].c;});
export const carById=id=>CARS.find(c=>c.id===id)||CARS[0];
function makeModelCar(s){
  const md=MODELS[s.model],m=md.META,g=new THREE.Group(),wheels=[];
  g.add(new THREE.Mesh(modelGeo(md,s.body),[M.vcolD,M.lights,M.halo]));
  const wl=modelWheel(md,false),wr=modelWheel(md,true);
  [[m.front,true],[m.rear,false]].forEach(function(a){
    [-1,1].forEach(function(sx){
      const piv=new THREE.Group();piv.position.set(sx*a[0][0],m.wheelR,a[0][1]);
      const mesh=new THREE.Mesh(sx<0?wl:wr,M.vcolD);piv.add(mesh);g.add(piv);
      wheels.push({piv:piv,mesh:mesh,front:a[1]});
    });
  });
  g.userData={wheels:wheels,r:m.wheelR,wx:m.rear[0],wz:m.rear[1]};
  return g;
}
/* color: cor da lataria escolhida na loja (opcional; sem ela, a cor original do carro) */
export function makeCar(id,color){
  const base=CARSPEC[id]||CARSPEC.pulga;
  if(base.model)return makeModelCar(color===undefined?base:Object.assign({},base,{body:color}));
  /* roofPaint: o teto (e as colunas) é parte da lataria e acompanha a cor escolhida */
  const s=color===undefined?base:Object.assign({},base,{c:color},base.roofPaint?{roof:color,pillarC:color}:{}), g=new THREE.Group();
  g.add(new THREE.Mesh(vehGeo(s,false),[M.vcol,M.lights,M.halo]));
  const wg=wheelGeo(s.r,s.ww,s.rimStyle,s.rim), wheels=[], ws=wheelsOf(s);
  ws.forEach(function(w){
    [-1,1].forEach(function(sx){
      const piv=new THREE.Group();piv.position.set(sx*w.x,s.r,w.z);
      const mesh=new THREE.Mesh(wg,M.vcol);piv.add(mesh);g.add(piv);
      wheels.push({piv:piv,mesh:mesh,front:w.front});
    });
  });
  const rw=ws[ws.length-1];
  g.userData={wheels:wheels,r:s.r,wx:rw.x,wz:rw.z};
  return g;
}
