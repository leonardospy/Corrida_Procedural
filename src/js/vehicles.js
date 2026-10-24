/* Carrocerias em loft, carros do jogador e trânsito */
import {M} from './scene.js';
import {H,PB,PCy,UB,geo,haloArr,tm,wheelGeo,wheelS} from './geometry.js';

/* ---------- Carros do jogador (frente em -z) ---------- */
const PRB=(w,h,l,x,y,z,c)=>PB(w,h,l,x,y,z,c);
/* ---------- Carrocerias em loft (sem THREE): uma casca contínua + cabine sobreposta ---------- */
const CKT=(function(){
  const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const hexRGB=h=>[((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255];
  const mixC=(a,b,t)=>{const A=hexRGB(a),B=hexRGB(b);return [A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t];};
  /* interpolação cúbica monótona (sem ondulações entre as estações) */
  function pchip(xs,ys){
    const n=xs.length,h=[],d=[],m=new Array(n);
    for(let i=0;i<n-1;i++){h[i]=xs[i+1]-xs[i];d[i]=(ys[i+1]-ys[i])/h[i];}
    m[0]=d[0];m[n-1]=d[n-2];
    for(let i=1;i<n-1;i++){
      if(d[i-1]*d[i]<=0)m[i]=0;
      else{const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]);}
    }
    return function(x){
      if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];
      let i=0;while(x>xs[i+1])i++;
      const t=(x-xs[i])/h[i],t2=t*t,t3=t2*t;
      return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h[i]*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h[i]*m[i+1];
    };
  }
  function ringUnit(M,n){
    const R=[];
    for(let i=0;i<M;i++){
      const a=i/M*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      R.push([Math.sign(c)*Math.pow(Math.abs(c),2/n),Math.sign(s)*Math.pow(Math.abs(s),2/n)]);
    }
    return R;
  }
  const BUMPC=0x22232b, UNDERC=0x111118, GLASS_LO=0x22355d, GLASS_HI=0x6a98d6;

  /* Monta o veículo: devolve funções de forma, buffers do loft e peças extras (descritores) */
  function make(s){
    const L=s.len, hwMax=s.w/2, M=24, nB=s.n||4, nC=s.nc||3.4;
    const wzs=s.wheelZ, r=s.r, Ra=1.22*r, need=2*r+0.1;
    const bz=s.body.map(p=>p[0]*L);
    const hwF=pchip(bz,s.body.map(p=>p[1]*hwMax));
    const ytF0=pchip(bz,s.body.map(p=>p[2]));
    const topF=function(z){
      let y=ytF0(z);
      wzs.forEach(function(zc){
        const dz=Math.abs(z-zc);
        if(dz<=Ra)y=Math.max(y,need);
        else if(dz<Ra+0.3){const t=sstep(0,1,(dz-Ra)/0.3);y=Math.max(y,need*(1-t)+y*t);}
      });
      return y;
    };
    const archTop=wzs.map(function(zc){return Math.max(s.yb+0.1,Math.min(1.5*r,topF(zc)-0.16));});
    const botF=function(z){
      let y=s.yb;
      wzs.forEach(function(zc,i){
        const dz=Math.abs(z-zc);
        if(dz<Ra){const f=Math.pow(Math.sqrt(1-(dz/Ra)*(dz/Ra)),0.8);y=Math.max(y,s.yb+(archTop[i]-s.yb)*f);}
      });
      return y;
    };
    /* estações do corpo: perfil + bordas dos arcos das rodas */
    let zs=bz.slice();
    wzs.forEach(function(zc){[-1,-0.93,-0.8,-0.55,-0.25,0,0.25,0.55,0.8,0.93,1].forEach(function(k){zs.push(zc+k*Ra);});});
    zs.sort(function(a,b){return a-b;});
    const zz=[zs[0]];
    for(let i=1;i<zs.length;i++){if(zs[i]-zz[zz.length-1]>0.035)zz.push(zs[i]);}
    zz[zz.length-1]=bz[bz.length-1];
    if(zz.length>1&&zz[zz.length-1]-zz[zz.length-2]<0.02)zz.splice(zz.length-2,1);
    const bodySt=zz.map(function(z){return {z:z,hw:hwF(z),yb:botF(z),yt:topF(z),kind:'b'};});
    /* cabine: perfil reamostrado, sempre dentro da casca em y (base logo abaixo da linha da cintura) */
    const cz=s.cab.map(p=>p[0]*L);
    const cabHwF=pchip(cz,s.cab.map(p=>p[1]*hwMax));
    const cabYtF=pchip(cz,s.cab.map(p=>p[2]));
    const cabYb=function(z){return Math.max(botF(z)+0.08,topF(z)-0.22);};
    const rank=function(a,b){if(a==='g'||b==='g')return 'g';if(a==='r'&&b==='r')return 'r';return 'p';};
    const cabSt=[];
    for(let i=0;i<s.cab.length;i++){
      cabSt.push({z:cz[i],k:s.cab[i][3],seg:null});
      if(i<s.cab.length-1){
        const dz=cz[i+1]-cz[i],k=Math.max(1,Math.round(dz/0.16));
        for(let j=1;j<k;j++)cabSt.push({z:cz[i]+dz*j/k,k:rank(s.cab[i][3],s.cab[i+1][3]),mid:true});
      }
    }
    cabSt.forEach(function(c,i){
      c.hw=cabHwF(c.z);c.yt=cabYtF(c.z);c.yb=cabYb(c.z);
      if(i<cabSt.length-1)c.seg=rank(c.k,cabSt[i+1].k);
    });
    /* vê se um ponto está dentro de uma casca */
    const inLoft=function(st,n,x,y,z,hwf,ybf,ytf){
      if(z<st[0].z-1e-6||z>st[st.length-1].z+1e-6)return false;
      const hw=hwf(z),yb=ybf(z),yt=ytf(z),yc=(yb+yt)/2,hh=(yt-yb)/2;
      if(hh<=0||hw<=0)return false;
      return Math.pow(Math.abs(x)/hw,n)+Math.pow(Math.abs(y-yc)/hh,n)<=1.0001;
    };
    const inBody=(x,y,z)=>inLoft(bodySt,nB,x,y,z,hwF,botF,topF);
    const inCab=(x,y,z)=>inLoft(cabSt,nC,x,y,z,cabHwF,cabYb,cabYtF);
    /* geração dos buffers */
    const paintFn=s.paint||function(){return null;};
    const roofC=s.roof!==undefined?s.roof:s.c;
    const RU_B=ringUnit(M,nB),RU_C=ringUnit(M,nC);
    const shade=function(ry){return 0.55+0.45*sstep(-0.75,0.15,ry);};
    function loft(st,RU,isCab){
      const P=[],N=[],C=[],G=st.length,V=[];
      for(let i=0;i<G;i++){
        const yc=(st[i].yb+st[i].yt)/2,hh=(st[i].yt-st[i].yb)/2,row=[];
        for(let j=0;j<M;j++)row.push([RU[j][0]*st[i].hw,yc+RU[j][1]*hh,st[i].z]);
        V.push(row);
      }
      const nrm=[];for(let i=0;i<G;i++){nrm.push([]);for(let j=0;j<M;j++)nrm[i].push([0,0,0]);}
      const quads=[];
      const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
      const crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      for(let i=0;i<G-1;i++)for(let j=0;j<M;j++){
        const j2=(j+1)%M;
        let q=[[i,j],[i,j2],[i+1,j2],[i+1,j]];
        const p=q.map(t=>V[t[0]][t[1]]);
        const cx=(p[0][0]+p[1][0]+p[2][0]+p[3][0])/4,cy=(p[0][1]+p[1][1]+p[2][1]+p[3][1])/4;
        const oyc=((st[i].yb+st[i].yt)+(st[i+1].yb+st[i+1].yt))/4;
        const fn=crs(sub(p[1],p[0]),sub(p[2],p[0]));
        if(fn[0]*cx+fn[1]*(cy-oyc)<0)q=[q[0],q[3],q[2],q[1]];
        const pp=q.map(t=>V[t[0]][t[1]]);
        const n1=crs(sub(pp[1],pp[0]),sub(pp[2],pp[0])),n2=crs(sub(pp[2],pp[0]),sub(pp[3],pp[0]));
        q.forEach(function(t,k){const a=nrm[t[0]][t[1]];const w=(k===0||k===2)?[n1,n2]:(k===1?[n1]:[n2]);w.forEach(function(nn){a[0]+=nn[0];a[1]+=nn[1];a[2]+=nn[2];});});
        quads.push({q:q,i:i,j:j,cx:cx,cy:cy});
      }
      const nz=function(a){const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
      quads.forEach(function(Q){
        const i=Q.i,j=Q.j,j2=(j+1)%M;
        const ry=(RU[j][1]+RU[j2][1])/2, rx=(RU[j][0]+RU[j2][0])/2;
        const zm=(st[i].z+st[i+1].z)/2;
        const seg=isCab?st[i].seg:'b';
        let col=null,flat=false;
        if(isCab){
          const ov=paintFn(zm,ry,rx,'c',seg);
          if(ov!==null&&ov!==undefined){col=hexRGB(ov);}
          else if(seg==='g')col=mixC(GLASS_LO,GLASS_HI,sstep(-0.2,1,ry));
          else if(seg==='r')col=ry>0.5?hexRGB(roofC):mixC(GLASS_LO,GLASS_HI,0.35);
          else col=hexRGB(roofC);
        }else{
          const ov=paintFn(zm,ry,rx,'b','b');
          if(ov!==null&&ov!==undefined)col=hexRGB(ov);
          else if(ry<-0.2&&(zm<-L/2+0.3||zm>L/2-0.3)){col=hexRGB(BUMPC);flat=true;}
          else col=hexRGB(s.c);
        }
        const isGlass=isCab&&(seg==='g'||(seg==='r'&&ry<=0.5));
        Q.q.forEach(function(t){
          const v=V[t[0]][t[1]],nn=nz(nrm[t[0]][t[1]]);
          // triângulos (0,1,2) e (0,2,3): emite vértice a vértice pela ordem do quad
        });
        const order=[0,1,2,0,2,3];
        order.forEach(function(k){
          const t=Q.q[k],v=V[t[0]][t[1]],nn=nz(nrm[t[0]][t[1]]);
          P.push(v[0],v[1],v[2]);N.push(nn[0],nn[1],nn[2]);
          const sh=(flat||isGlass)?1:shade(RU[t[1]][1]);
          C.push(col[0]*sh,col[1]*sh,col[2]*sh);
        });
      });
      /* tampas das pontas */
      [[0,-1],[G-1,1]].forEach(function(e){
        const i=e[0],sgn=e[1],yc=(st[i].yb+st[i].yt)/2;
        const col=hexRGB(isCab?(st[i].k==='g'?GLASS_LO:roofC):(paintFn(st[i].z,0,1,'b','b')||s.c));
        for(let j=0;j<M;j++){
          const j2=(j+1)%M;
          const a=[0,yc,st[i].z],b=V[i][j],c=V[i][j2];
          const f=crs(sub(b,a),sub(c,a));
          const tri=(f[2]*sgn>0)?[a,b,c]:[a,c,b];
          tri.forEach(function(v){P.push(v[0],v[1],v[2]);N.push(0,0,sgn);C.push(col[0]*0.9,col[1]*0.9,col[2]*0.9);});
        }
      });
      return {P:P,N:N,C:C};
    }
    const body=loft(bodySt,RU_B,false), cab=loft(cabSt,RU_C,true);
    /* rodas: x escolhido automaticamente para a face externa do pneu ficar dentro da casca */
    const wheels=[];
    const wheelOK=function(zc,wx,steer){
      for(let a=0;a<360;a+=10){
        const rad=a*Math.PI/180,dz=r*Math.cos(rad),y=r+r*Math.sin(rad);
        for(let sx=-1;sx<=1;sx+=2){
          const dx=sx*s.ww/2,cs=Math.cos(steer),sn=Math.sin(steer);
          const x=wx+dx*cs+dz*sn,z=zc-dx*sn+dz*cs;
          if(z<bodySt[0].z+0.1||z>bodySt[bodySt.length-1].z-0.1)return false;
          if(y>botF(z)+0.06&&!inBody(x,y,z))return false;
        }
      }
      return true;
    };
    wzs.forEach(function(zc){
      const front=zc<0;let gap=0.03,wx=0,ok=false;
      for(;gap<0.4;gap+=0.01){
        wx=hwF(zc)-s.ww/2-gap;
        if(wheelOK(zc,wx,front?0.22:0)){ok=true;break;}
      }
      wheels.push({z:zc,x:wx,front:front,ok:ok,gap:gap});
    });
    const k={L:L,w:s.w,yb:s.yb,hw:hwF,top:topF,bot:botF,cabHw:cabHwF,cabTop:cabYtF,cabBot:cabYb,
      inBody:inBody,inCab:inCab,cabZ0:cz[0],cabZ1:cz[cz.length-1],r:r,ww:s.ww,wheelZ:wzs,
      box:function(w,h,l,x,y,z,c,o){o=o||{};return {t:'b',w:w,h:h,l:l,x:x,y:y,z:z,c:c,rr:o.rr||0,a:o.a||[x,y,z],L:!!o.L,rx:o.rx||0,ry:o.ry||0,rz:o.rz||0};},
      cyl:function(rad,h,seg,x,y,z,c,o){o=o||{};return {t:'c',rad:rad,h:h,seg:seg,x:x,y:y,z:z,c:c,rx:o.rx||0,a:o.a||[x,y,z],L:!!o.L};},
      /* disco virado para frente (s=-1) ou para trás (s=1): faróis redondos, logotipos, aros cromados */
      disc:function(rad,x,y,z,c,o){o=o||{};return {t:'c',rad:rad,h:o.h||0.05,seg:o.seg||14,x:x,y:y,z:z,c:c,rx:Math.PI/2,a:o.a||[x,y,z],L:!!o.L};}
    };
    const extras=s.extras?s.extras(k):[];
    const lights=s.lights?s.lights(k):[];
    return {spec:s,k:k,body:body,cab:cab,bodySt:bodySt,cabSt:cabSt,wheels:wheels,extras:extras,lights:lights,
      inBody:inBody,inCab:inCab,wheelOK:wheelOK};
  }
  /* verificação numérica: todas as peças presas e rodas dentro da carroceria */
  function check(v){
    const errs=[],s=v.spec;
    v.wheels.forEach(function(w,i){if(!w.ok)errs.push(s.id+': roda '+i+' não coube na carroceria');});
    const bbox=function(e){
      if(e.t==='b')return [e.x-e.w/2,e.x+e.w/2,e.y-e.h/2,e.y+e.h/2,e.z-e.l/2,e.z+e.l/2];
      const R=e.rad,hh=e.h/2;
      return e.rx?[e.x-R,e.x+R,e.y-R,e.y+R,e.z-hh,e.z+hh]:[e.x-R,e.x+R,e.y-hh,e.y+hh,e.z-R,e.z+R];
    };
    const inb=(b,p)=>p[0]>=b[0]-1e-6&&p[0]<=b[1]+1e-6&&p[1]>=b[2]-1e-6&&p[1]<=b[3]+1e-6&&p[2]>=b[4]-1e-6&&p[2]<=b[5]+1e-6;
    const all=v.extras.concat(v.lights);
    const att=new Array(all.length).fill(false);
    all.forEach(function(e,i){const a=e.a;if(v.inBody(a[0],a[1],a[2])||v.inCab(a[0],a[1],a[2]))att[i]=true;});
    let ch=true;
    while(ch){ch=false;all.forEach(function(e,i){if(att[i])return;all.forEach(function(f,j){if(att[j]&&j!==i&&inb(bbox(f),e.a)){att[i]=true;ch=true;}});});}
    all.forEach(function(e,i){if(!att[i])errs.push(s.id+': peça solta '+i+' ('+e.t+' em '+e.x.toFixed(2)+','+e.y.toFixed(2)+','+e.z.toFixed(2)+')');});
    /* altura do arco x pneu: topo do pneu abaixo do teto da casca */
    v.wheels.forEach(function(w,i){if(2*s.r>v.k.top(w.z)-0.04)errs.push(s.id+': pneu '+i+' ultrapassa o teto da casca');});
    return errs;
  }
  return {make:make,check:check,pchip:pchip};
})();


/* ---------- Especificações: esportivos inspirados em carros reais + trânsito ---------- */
const GLS=0x2c4270;
const stdLights=function(o){
  o=o||{};
  return function(k){
    const L=k.L,out=[];
    const zf=-L/2,zr=L/2;
    const hf=k.hw(zf+0.05),hr=k.hw(zr-0.05);
    const yf=k.bot(zf)+(k.top(zf)-k.bot(zf))*(o.fy||0.58), yr=k.bot(zr)+(k.top(zr)-k.bot(zr))*(o.ry||0.6);
    const fw=o.fw||0.42,fh=o.fh||0.13,rw=o.rw||0.5,rh=o.rh||0.12;
    [-1,1].forEach(function(s){
      if(fw>0)out.push(k.box(fw,fh,0.08,s*hf*(o.fx||0.62),yf,zf+0.02,0xfff3c4,{L:true}));
      if(rw>0)out.push(k.box(rw,rh,0.08,s*hr*(o.rx||0.6),yr,zr-0.02,0xff2d2d,{L:true}));
    });
    if(o.grille!==false)out.push(k.box(hf*0.8,0.1,0.08,0,k.bot(zf)+(k.top(zf)-k.bot(zf))*0.28,zf+0.02,0x0c0c10,{L:false}));
    return out;
  };
};
const mirrors=function(k,zf,col){
  const z=k.cabZ0+(k.cabZ1-k.cabZ0)*zf,out=[];
  const hwC=k.cabHw(z),y=k.top(z)+0.06;
  [-1,1].forEach(function(s){out.push(k.box(0.2,0.11,0.14,s*(hwC+0.06),y,z,col,{rr:0.04,a:[s*(hwC-0.06),k.top(z)-0.03,z]}));});
  return out;
};
/* ---------- Detalhes de marca: faróis, grades, logotipos e placas ---------- */
const CHROME=0xd2d6dc, BLACK=0x0c0c10, AMBER=0xffa21a, HEAD=0xfff3c4, TAIL=0xff2d2d;
const yAt=(k,z,f)=>k.bot(z)+(k.top(z)-k.bot(z))*f;
const ends=k=>({zf:-k.L/2,zr:k.L/2,hf:k.hw(-k.L/2+0.05),hr:k.hw(k.L/2-0.05)});
/* placa Mercosul: branca com a faixa azul no alto (s=-1 frente, s=1 traseira) */
function plate(k,s,f){
  const z=s*k.L/2+s*0.012, y=yAt(k,s*k.L/2,f);
  return [k.box(0.5,0.14,0.03,0,y,z,0xf4f4f0),k.box(0.5,0.035,0.035,0,y+0.055,z+s*0.003,0x1f4fb4)];
}
/* losango Mitsubishi: três losangos vermelhos apontando para o centro */
function threeDiamonds(k,y,z){
  const out=[];
  [90,210,330].forEach(function(a){
    const r=a*Math.PI/180;
    out.push(k.box(0.05,0.085,0.03,Math.cos(r)*0.05,y+Math.sin(r)*0.05,z,0xd0102a,{rz:r-Math.PI/2}));
  });
  return out;
}
/* quatro argolas Audi: discos cromados com miolo escuro, sobrepostos em fila */
function fourRings(k,y,z){
  const out=[];
  for(let n=0;n<4;n++){const x=(n-1.5)*0.075;out.push(k.disc(0.05,x,y,z,CHROME,{h:0.02}),k.disc(0.033,x,y,z-0.012,BLACK,{h:0.02}));}
  return out;
}
/* farol em Y (Lamborghini): três filetes; s = lado, back = traseira */
function yLamp(k,x,y,z,s,col,back){
  const o={L:true},sz=back?1:-1;
  return [k.box(0.2,0.04,0.03,x,y,z,col,o),
    k.box(0.16,0.035,0.03,x+s*0.13,y+0.05,z+sz*0.005,col,{L:true,rz:s*0.6}),
    k.box(0.16,0.035,0.03,x+s*0.13,y-0.05,z+sz*0.005,col,{L:true,rz:-s*0.6})];
}
const wingAt=function(k,zc,upH,plateW,plateL,col,upX){
  const out=[],deck=k.top(zc);
  [-1,1].forEach(function(s){out.push(k.box(0.07,upH+0.06,0.14,s*upX,deck-0.03+(upH+0.06)/2,zc,col,{a:[s*upX,deck-0.03,zc]}));});
  out.push(k.box(plateW,0.05,plateL,0,deck+upH+0.025,zc,col,{rr:0.02,a:[upX,deck+upH,zc]}));
  return out;
};
const CARSPEC={
  /* hatch urbano de teto branco (estilo Fiat 500) */
  pulga:{id:'pulga',w:1.72,len:3.3,r:0.3,ww:0.24,yb:0.2,wheelZ:[-1.0,1.0],c:0xffc24a,roof:0xf2efe6,n:4,nc:3.2,
    body:[[-0.5,0.8,0.6],[-0.46,0.92,0.7],[-0.38,0.99,0.78],[-0.22,1,0.82],[0.2,1,0.84],[0.4,0.98,0.82],[0.47,0.93,0.76],[0.5,0.84,0.68]],
    cab:[[-0.21,0.86,0.82,'g'],[-0.17,0.84,1.1,'g'],[-0.1,0.8,1.4,'g'],[-0.04,0.78,1.5,'r'],[0.22,0.78,1.5,'r'],[0.31,0.8,1.36,'g'],[0.4,0.84,1.0,'g'],[0.45,0.88,0.82,'g']],
    /* faróis redondos com aro cromado, "bigode" cromado com o escudo e lanternas verticais */
    extras:function(k){
      const e=ends(k),y=yAt(k,e.zf,0.6),out=mirrors(k,0.2,0xffc24a);
      out.push(k.box(e.hf*0.5,0.04,0.04,0,y-0.03,e.zf-0.01,CHROME),k.disc(0.065,0,y-0.03,e.zf-0.03,0xc8102e,{h:0.03}));
      [-1,1].forEach(function(s){out.push(k.disc(0.155,s*e.hf*0.6,y,e.zf-0.008,CHROME,{h:0.03}));});
      out.push(k.box(e.hr*1.1,0.04,0.04,0,yAt(k,e.zr,0.5),e.zr+0.01,CHROME));
      return out.concat(plate(k,-1,0.25),plate(k,1,0.32));
    },
    lights:function(k){
      const e=ends(k),y=yAt(k,e.zf,0.6),out=[];
      [-1,1].forEach(function(s){
        out.push(k.disc(0.12,s*e.hf*0.6,y,e.zf-0.03,HEAD,{L:true}));
        out.push(k.disc(0.045,s*e.hf*0.6,y-0.21,e.zf-0.01,AMBER,{L:true}));
        out.push(k.box(0.14,0.26,0.05,s*e.hr*0.74,yAt(k,e.zr,0.64),e.zr+0.012,TAIL,{L:true}));
      });
      return out;
    }},
  /* sedã de rali com tomada de ar no capô e asa alta (estilo Lancer Evolution) */
  gt:{id:'gt',w:1.86,len:4.3,r:0.35,ww:0.28,yb:0.2,wheelZ:[-1.33,1.33],c:0xe84a3a,n:4,nc:3.4,
    body:[[-0.5,0.82,0.58],[-0.45,0.93,0.7],[-0.38,1,0.8],[-0.28,1,0.88],[-0.12,1,0.9],[0.2,1,0.9],[0.4,0.98,0.93],[0.47,0.94,0.9],[0.5,0.9,0.86]],
    cab:[[-0.17,0.86,0.9,'g'],[-0.08,0.84,1.18,'g'],[-0.03,0.82,1.3,'r'],[0.15,0.82,1.3,'r'],[0.26,0.86,1.06,'g'],[0.33,0.9,0.94,'g']],
    extras:function(k){
      const out=mirrors(k,0.2,0xe84a3a),L=k.L,zh=-0.22*L,hy=k.top(zh);
      out.push(k.box(0.5,0.14,0.72,0,hy+0.03,zh,0x15161c,{rr:0.05,a:[0,hy-0.05,zh]}));
      out.push(k.box(k.w*0.9,0.05,0.26,0,k.yb+0.02,-L/2+0.02,0x15161c,{a:[0,k.yb+0.06,-L/2+0.1]}));
      /* grade "jet fighter": trapézio preto enorme com os três losangos; saídas de ar no capô */
      const e=ends(k),yg=yAt(k,e.zf,0.36);
      out.push(k.box(e.hf*1.5,0.3,0.04,0,yg,e.zf-0.01,BLACK),k.box(e.hf*1.2,0.1,0.04,0,yg+0.19,e.zf-0.01,BLACK));
      out.push(...threeDiamonds(k,yg+0.06,e.zf-0.035));
      [-1,1].forEach(function(s){const z=-0.34*L;out.push(k.box(0.22,0.03,0.26,s*0.3,k.top(z)+0.005,z,0x15161c));});
      /* aletas no fim do teto */
      const zr=k.cabZ1-0.28;for(let n=0;n<5;n++)out.push(k.box(0.025,0.07,0.12,(n-2)*0.13,k.cabTop(zr)+0.03,zr,0x15161c,{a:[(n-2)*0.13,k.cabTop(zr)-0.02,zr]}));
      out.push(k.box(e.hr*1.3,0.12,0.04,0,yAt(k,e.zr,0.18),e.zr+0.01,0x15161c));
      return out.concat(wingAt(k,0.44*L,0.3,k.w*0.92,0.42,0x15161c,0.55),plate(k,1,0.38));
    },
    lights:function(k){
      const e=ends(k),out=[];
      [-1,1].forEach(function(s){
        out.push(k.box(0.5,0.1,0.05,s*e.hf*0.64,yAt(k,e.zf,0.66),e.zf-0.01,HEAD,{L:true,rz:s*0.14}));
        out.push(k.disc(0.06,s*e.hf*0.78,yAt(k,e.zf,0.2),e.zf-0.015,HEAD,{L:true}));
        out.push(k.box(0.52,0.12,0.05,s*e.hr*0.62,yAt(k,e.zr,0.66),e.zr+0.012,TAIL,{L:true}));
      });
      return out;
    }},
  /* cupê arredondado com faróis escamoteáveis (estilo RX-7) */
  cupe:{id:'cupe',w:1.92,len:4.4,r:0.35,ww:0.3,yb:0.2,wheelZ:[-1.36,1.36],c:0x2ec4b6,n:4,nc:3.0,
    body:[[-0.5,0.8,0.5],[-0.46,0.92,0.58],[-0.4,0.99,0.68],[-0.3,1,0.84],[-0.18,1,0.82],[0.1,1,0.84],[0.3,1,0.86],[0.43,0.98,0.86],[0.5,0.9,0.78]],
    cab:[[-0.2,0.86,0.82,'g'],[-0.12,0.84,1.0,'g'],[-0.05,0.8,1.16,'r'],[0.1,0.8,1.2,'r'],[0.22,0.82,1.08,'g'],[0.32,0.88,0.9,'g']],
    extras:function(k){
      const out=mirrors(k,0.2,0x2ec4b6),L=k.L;
      [-1,1].forEach(function(s){
        const z=-0.37*L,x=s*k.hw(z)*0.62,y=k.top(z);
        out.push(k.box(0.4,0.13,0.36,x,y+0.0,z,0x2ec4b6,{rr:0.05,a:[x,y-0.06,z]}));
        out.push(k.box(0.3,0.05,0.04,x,y+0.02,z-0.17,0xfff3c4,{L:true,a:[x,y+0.02,z-0.14]}));
      });
      const zd=0.4*L;
      out.push(k.box(k.w*0.7,0.05,0.3,0,k.top(zd)+0.04,zd+0.1,0x1b8a80,{rr:0.02,a:[0,k.top(zd)-0.02,zd+0.05]}));
      /* boca oval no para-choque e painel traseiro fumê de ponta a ponta */
      const e=ends(k),yb=yAt(k,e.zf,0.3),w=e.hf*0.9;
      out.push(k.box(w,0.16,0.04,0,yb,e.zf-0.01,BLACK),k.disc(0.08,-w/2,yb,e.zf-0.01,BLACK,{h:0.04}),k.disc(0.08,w/2,yb,e.zf-0.01,BLACK,{h:0.04}));
      out.push(k.box(e.hr*1.8,0.17,0.04,0,yAt(k,e.zr,0.62),e.zr+0.008,0x1a0c10));
      return out.concat(plate(k,1,0.3));
    },
    lights:function(k){
      const e=ends(k),out=[],y=yAt(k,e.zr,0.62);
      [-1,1].forEach(function(s){
        out.push(k.disc(0.07,s*e.hr*0.56,y,e.zr+0.03,TAIL,{L:true}),k.disc(0.07,s*e.hr*0.8,y,e.zr+0.03,TAIL,{L:true}));
        out.push(k.disc(0.05,s*e.hf*0.72,yAt(k,e.zf,0.42),e.zf-0.012,AMBER,{L:true}));
      });
      return out;
    }},
  /* cupê longo com asa enorme (estilo Supra MK4) */
  muscle:{id:'muscle',w:2.06,len:4.7,r:0.36,ww:0.32,yb:0.2,wheelZ:[-1.45,1.45],c:0x7c6cf0,n:4,nc:3.2,
    body:[[-0.5,0.82,0.56],[-0.45,0.94,0.68],[-0.38,1,0.78],[-0.3,1,0.92],[-0.2,1,0.9],[0,1,0.92],[0.3,1,0.94],[0.44,0.97,0.92],[0.5,0.88,0.84]],
    cab:[[-0.06,0.84,0.92,'g'],[0.01,0.82,1.16,'g'],[0.06,0.78,1.27,'r'],[0.2,0.78,1.28,'r'],[0.3,0.82,1.1,'g'],[0.4,0.9,0.96,'g']],
    extras:function(k){
      const out=mirrors(k,0.2,0x7c6cf0),L=k.L;
      out.push(k.cyl(0.075,0.2,10,-0.5,k.yb+0.12,L/2-0.02,0x9aa0aa,{rx:Math.PI/2,a:[-0.5,k.yb+0.12,L/2-0.08]}));
      out.push(k.cyl(0.075,0.2,10,0.5,k.yb+0.12,L/2-0.02,0x9aa0aa,{rx:Math.PI/2,a:[0.5,k.yb+0.12,L/2-0.08]}));
      /* boca grande no para-choque e caixas escuras dos faróis triplos */
      const e=ends(k);
      out.push(k.box(e.hf*1.25,0.2,0.04,0,yAt(k,e.zf,0.24),e.zf-0.01,BLACK),k.box(e.hf*0.5,0.05,0.04,0,yAt(k,e.zf,0.5),e.zf-0.01,BLACK));
      [-1,1].forEach(function(s){out.push(k.box(0.5,0.16,0.04,s*e.hf*0.62,yAt(k,e.zf,0.66),e.zf-0.008,0x1b1d26));});
      out.push(k.disc(0.055,0,yAt(k,e.zr,0.62),e.zr+0.02,CHROME,{h:0.03}));
      return out.concat(wingAt(k,0.455*L,0.4,k.w*0.95,0.5,0x4b3fb5,0.62),plate(k,1,0.36));
    },
    /* quatro lanternas redondas na traseira, faróis com três lentes */
    lights:function(k){
      const e=ends(k),out=[],yr=yAt(k,e.zr,0.62),yf=yAt(k,e.zf,0.66);
      [-1,1].forEach(function(s){
        out.push(k.disc(0.1,s*e.hr*0.42,yr,e.zr+0.03,TAIL,{L:true}),k.disc(0.1,s*e.hr*0.72,yr,e.zr+0.03,TAIL,{L:true}));
        out.push(k.disc(0.07,s*e.hf*0.78,yf,e.zf-0.03,HEAD,{L:true}),k.disc(0.05,s*e.hf*0.6,yf,e.zf-0.03,HEAD,{L:true}),k.disc(0.045,s*e.hf*0.46,yf,e.zf-0.03,AMBER,{L:true}));
      });
      return out;
    }},
  /* motor central com lâminas laterais (estilo Audi R8) */
  veloce:{id:'veloce',w:2.0,len:4.6,r:0.36,ww:0.32,yb:0.2,wheelZ:[-1.42,1.42],c:0xf4f1ea,n:4.4,nc:3.2,
    body:[[-0.5,0.82,0.52],[-0.45,0.94,0.64],[-0.38,1,0.78],[-0.3,1,0.88],[-0.2,1,0.84],[-0.05,1,0.86],[0.2,1,0.9],[0.38,1,0.92],[0.46,0.95,0.86],[0.5,0.86,0.78]],
    cab:[[-0.2,0.86,0.84,'g'],[-0.12,0.84,1.04,'g'],[-0.05,0.8,1.17,'r'],[0.08,0.8,1.2,'r'],[0.2,0.82,1.12,'g'],[0.3,0.86,1.0,'g'],[0.37,0.9,0.93,'g']],
    paint:function(z,ry,rx,part){
      if(part==='b'&&Math.abs(ry)<0.6&&z>-0.02*4.6&&z<0.22*4.6&&Math.abs(rx)>0.8)return 0x22232b;
      return null;
    },
    extras:function(k){
      const out=mirrors(k,0.2,0x22232b),L=k.L,z=0.38*L;
      [-1,1].forEach(function(s){out.push(k.box(0.3,0.05,0.04,s*0.5,k.top(-L/2)*0.9,-L/2+0.0,0xfff3c4,{L:true,a:[s*0.5,k.top(-L/2)*0.9,-L/2+0.05]}));});
      const zl=0.43*L;out.push(k.box(k.w*0.6,0.05,0.2,0,k.top(zl)+0.04,zl,0x22232b,{rr:0.02,a:[0,k.top(zl)-0.03,zl]}));
      out.push(k.cyl(0.07,0.2,10,-0.55,k.yb+0.14,L/2-0.02,0x9aa0aa,{rx:Math.PI/2,a:[-0.55,k.yb+0.14,L/2-0.08]}));
      out.push(k.cyl(0.07,0.2,10,0.55,k.yb+0.14,L/2-0.02,0x9aa0aa,{rx:Math.PI/2,a:[0.55,k.yb+0.14,L/2-0.08]}));
      /* grade Singleframe com moldura cromada e as quatro argolas; grade traseira em tela */
      const e=ends(k),yg=yAt(k,e.zf,0.5);
      out.push(k.box(0.78,0.27,0.03,0,yg,e.zf-0.006,CHROME),k.box(0.7,0.22,0.04,0,yg,e.zf-0.02,BLACK));
      [-1,1].forEach(function(s){out.push(k.box(0.34,0.12,0.04,s*e.hf*0.74,yAt(k,e.zf,0.36),e.zf-0.01,BLACK));});
      out.push(...fourRings(k,yg+0.035,e.zf-0.035));
      out.push(k.box(e.hr*1.4,0.15,0.04,0,yAt(k,e.zr,0.4),e.zr+0.008,0x18191f));
      return out.concat(plate(k,1,0.62));
    },
    lights:function(k){
      const e=ends(k),out=[];
      [-1,1].forEach(function(s){
        out.push(k.box(0.48,0.12,0.04,s*e.hf*0.64,yAt(k,e.zf,0.68),e.zf-0.008,0x1b1d26));
        out.push(k.box(0.42,0.03,0.04,s*e.hf*0.64,yAt(k,e.zf,0.62),e.zf-0.02,HEAD,{L:true,rz:s*0.08}));
        out.push(k.disc(0.045,s*e.hf*0.52,yAt(k,e.zf,0.7),e.zf-0.02,HEAD,{L:true}),k.disc(0.045,s*e.hf*0.74,yAt(k,e.zf,0.7),e.zf-0.02,HEAD,{L:true}));
        out.push(k.box(0.58,0.07,0.05,s*e.hr*0.6,yAt(k,e.zr,0.68),e.zr+0.012,TAIL,{L:true}));
      });
      return out;
    }},
  /* cunha baixa com entradas de ar e escapamento hexagonal (estilo Lamborghini) */
  hiper:{id:'hiper',w:2.1,len:4.8,r:0.36,ww:0.34,yb:0.18,wheelZ:[-1.48,1.48],c:0xffd23f,n:5,nc:3.4,
    body:[[-0.5,0.8,0.44],[-0.46,0.92,0.5],[-0.4,0.99,0.62],[-0.31,1,0.82],[-0.18,1,0.78],[0,1,0.82],[0.25,1,0.9],[0.4,1,0.94],[0.47,0.96,0.88],[0.5,0.9,0.8]],
    cab:[[-0.22,0.84,0.8,'g'],[-0.1,0.82,1.0,'g'],[-0.02,0.78,1.1,'r'],[0.1,0.78,1.12,'r'],[0.2,0.82,1.02,'p'],[0.3,0.88,0.97,'p'],[0.36,0.92,0.94,'p']],
    paint:function(z,ry,rx,part){
      if(part==='b'&&Math.abs(ry)<0.7&&z>0.06*4.8&&z<0.26*4.8&&Math.abs(rx)>0.8)return 0x15161c;
      return null;
    },
    extras:function(k){
      const out=mirrors(k,0.2,0x15161c),L=k.L;
      out.push(k.cyl(0.11,0.2,6,0,k.yb+0.22,L/2-0.02,0x2a2c34,{rx:Math.PI/2,a:[0,k.yb+0.22,L/2-0.08]}));
      /* entradas de ar triangulares na frente e grelhas sobre o motor */
      const e=ends(k);
      [-1,1].forEach(function(s){
        out.push(k.box(0.55,0.22,0.04,s*e.hf*0.6,yAt(k,e.zf,0.3),e.zf-0.01,BLACK,{rz:s*0.35}));
        out.push(k.box(0.4,0.14,0.04,s*e.hr*0.6,yAt(k,e.zr,0.3),e.zr+0.01,BLACK,{rz:-s*0.3}));
      });
      for(let n=0;n<4;n++){const z=0.2*L+n*0.16;out.push(k.box(0.9,0.02,0.07,0,k.top(z)+0.005,z,0x15161c));}
      const zd=0.44*L;
      return out.concat(wingAt(k,zd,0.22,k.w*0.8,0.34,0x15161c,0.55),plate(k,1,0.55));
    },
    /* faróis e lanternas em Y */
    lights:function(k){
      const e=ends(k),out=[];
      [-1,1].forEach(function(s){
        out.push(...yLamp(k,s*e.hf*0.58,yAt(k,e.zf,0.66),e.zf-0.012,s,HEAD,false));
        out.push(...yLamp(k,s*e.hr*0.62,yAt(k,e.zr,0.66),e.zr+0.012,s,TAIL,true));
      });
      return out;
    }}
};
/* trânsito */
const TRAFFIC={
  sedan:function(c){return {id:'sedan',w:1.9,len:4.2,r:0.34,ww:0.26,yb:0.22,wheelZ:[-1.3,1.3],c:c,n:4,nc:3.4,
    body:[[-0.5,0.84,0.62],[-0.46,0.94,0.74],[-0.4,1,0.84],[-0.3,1,0.88],[0.3,1,0.9],[0.44,0.97,0.88],[0.5,0.88,0.8]],
    cab:[[-0.15,0.86,0.9,'g'],[-0.06,0.84,1.2,'g'],[0.0,0.82,1.38,'r'],[0.14,0.82,1.38,'r'],[0.26,0.86,1.04,'g'],[0.32,0.9,0.92,'g']],
    extras:function(k){
      const e=ends(k),yg=yAt(k,e.zf,0.42);
      return mirrors(k,0.2,c).concat([k.box(e.hf*0.9,0.14,0.04,0,yg,e.zf-0.01,BLACK),k.box(e.hf*0.9,0.025,0.045,0,yg+0.02,e.zf-0.012,CHROME),
        k.disc(0.05,0,yg+0.02,e.zf-0.03,CHROME,{h:0.03})],plate(k,-1,0.2),plate(k,1,0.34));
    },
    lights:stdLights({fw:0.44,fh:0.12,fy:0.6,fx:0.62,rw:0.5,rh:0.12,ry:0.62,grille:false})};},
  /* perua de frente chata em duas cores com o "V" e o círculo grande na frente (estilo Kombi) */
  van:function(c,st){return {id:'van',w:2.05,len:4.7,r:0.38,ww:0.26,yb:0.28,wheelZ:[-1.5,1.5],c:c,roof:st,n:5,nc:5,
    body:[[-0.5,0.86,0.82],[-0.47,0.96,0.95],[-0.4,1,1.02],[0.4,1,1.02],[0.5,0.94,1.0]],
    cab:[[-0.4,0.9,1.0,'g'],[-0.34,0.9,1.7,'g'],[-0.3,0.92,1.95,'r'],[-0.14,0.92,1.97,'r'],[-0.1,0.94,1.97,'p'],[0.46,0.94,1.94,'p'],[0.5,0.9,1.86,'p']],
    paint:function(z,ry,rx,part,seg){
      if(part==='c'&&seg==='p')return ry>-0.2?st:c;
      return null;
    },
    extras:function(k){
      const e=ends(k),y0=yAt(k,e.zf,0.55),out=mirrors(k,0.08,st);
      /* "V" claro: dois painéis inclinados que se encontram no centro, e o círculo do logotipo */
      [-1,1].forEach(function(s){out.push(k.box(0.95,0.2,0.03,s*0.36,y0+0.22,e.zf-0.008,st,{rz:-s*0.42}));});
      out.push(k.disc(0.2,0,y0+0.02,e.zf-0.02,st,{h:0.03}),k.disc(0.15,0,y0+0.02,e.zf-0.03,c,{h:0.03}));
      out.push(k.box(0.05,0.2,0.03,-0.035,y0+0.02,e.zf-0.042,st,{rz:0.35}),k.box(0.05,0.2,0.03,0.035,y0+0.02,e.zf-0.042,st,{rz:-0.35}));
      out.push(k.box(e.hf*1.9,0.1,0.06,0,yAt(k,e.zf,0.08),e.zf-0.02,CHROME));
      return out.concat(plate(k,-1,0.18),plate(k,1,0.3));
    },
    lights:function(k){
      const e=ends(k),out=[],y=yAt(k,e.zf,0.42);
      [-1,1].forEach(function(s){
        out.push(k.disc(0.15,s*e.hf*0.72,y,e.zf-0.01,CHROME,{h:0.03}),k.disc(0.12,s*e.hf*0.72,y,e.zf-0.03,HEAD,{L:true}));
        out.push(k.disc(0.05,s*e.hf*0.72,y+0.25,e.zf-0.01,AMBER,{L:true}));
        out.push(k.box(0.16,0.24,0.05,s*e.hr*0.86,yAt(k,e.zr,0.5),e.zr+0.012,TAIL,{L:true}));
      });
      return out;
    }};},
  truck:function(cargo,cab,stripe){return {id:'truck',w:2.4,len:7.1,r:0.5,ww:0.4,yb:0.5,wheelZ:[-2.4,0.6,2.2],c:0x1e2028,n:6,nc:4,
    body:[[-0.5,0.8,1.0],[-0.48,0.94,1.2],[-0.44,1,1.3],[0.4,1,1.3],[0.5,0.96,1.3]],
    cab:[[-0.47,0.9,1.3,'g'],[-0.455,0.92,2.1,'g'],[-0.41,0.9,2.55,'r'],[-0.3,0.9,2.6,'r'],[-0.28,0.9,2.58,'p'],[-0.27,0.9,1.5,'p']],
    roof:cab,
    paint:function(z,ry,rx,part){return part==='b'&&z<-0.22*7.1?cab:null;},
    extras:function(k){
      const o=[];
      o.push(k.box(2.5,2.3,4.8,0,2.25,0.95,cargo,{rr:0.2,a:[0,1.3,0.95]}));
      o.push(k.box(2.52,0.28,4.82,0,3.25,0.95,stripe,{a:[0,3.1,0.95]}));
      [-1,1].forEach(function(s){o.push(k.box(0.14,0.4,0.12,s*1.4,1.8,-2.9,0x15161c,{a:[s*0.9,1.8,-2.9]}));});
      /* grade cromada de caminhão, para-choque e defletor no teto da cabine */
      const e=ends(k),yg=yAt(k,e.zf,0.5);
      o.push(k.box(1.3,0.5,0.04,0,yg,e.zf-0.01,0x2a2c33));
      for(let n=0;n<5;n++)o.push(k.box(1.3,0.035,0.05,0,yg-0.2+n*0.1,e.zf-0.02,CHROME));
      o.push(k.box(k.w*0.95,0.22,0.12,0,yAt(k,e.zf,0.12),e.zf-0.03,0x3a3d46));
      const zc=k.cabZ0+0.45;o.push(k.box(2.1,0.5,0.6,0,k.cabTop(zc)+0.25,zc+0.2,cab,{a:[0,k.cabTop(zc)-0.05,zc]}));
      return o.concat(plate(k,-1,0.25));
    },
    lights:stdLights({fw:0.45,fh:0.22,fy:0.6,fx:0.7,rw:0.45,rh:0.22,ry:0.6,rx:0.7,grille:false})};}
};

/* cola com o THREE: descritores viram malhas; tudo numa geometria com grupos [corpo, luzes, brilho] */
const rawG=g=>({P:g.attributes.position.array,N:g.attributes.normal.array,C:g.attributes.color.array});
const partOf=e=>e.t==='b'
  ?((e.rx||e.ry||e.rz)?{g:UB,m:tm(e.x,e.y,e.z,e.w,e.h,e.l,e.rx,e.ry,e.rz),c:e.c}:e.rr>0?PRB(e.w,e.h,e.l,e.x,e.y,e.z,e.c,Math.min(e.rr,e.w/2-0.005,e.h/2-0.005,e.l/2-0.005)):PB(e.w,e.h,e.l,e.x,e.y,e.z,e.c))
  :PCy(e.rad,e.rad,e.h,e.seg,e.x,e.y,e.z,e.c,e.rx||0,0,0);
function packGeo(groups){
  let tot=0;groups.forEach(g=>g.forEach(r=>{tot+=r.P.length;}));
  const P=new Float32Array(tot),N=new Float32Array(tot),C=new Float32Array(tot),gs=[];let o=0;
  groups.forEach(function(g,mi){
    const st=o;
    g.forEach(function(r){P.set(r.P,o);if(r.N)N.set(r.N,o);C.set(r.C,o);o+=r.P.length;});
    if(o>st)gs.push([st/3,(o-st)/3,mi]);
  });
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(P,3));
  out.setAttribute('normal',new THREE.BufferAttribute(N,3));
  out.setAttribute('color',new THREE.BufferAttribute(C,3));
  gs.forEach(function(g){out.addGroup(g[0],g[1],g[2]);});
  return out;
}
function vehGeo(s,baked,halo,vIn){
  const v=vIn||CKT.make(s);
  const g0=[v.body,v.cab],g1=[],g2=[];
  const pb=v.extras.filter(e=>!e.L).map(partOf), pl=v.extras.filter(e=>e.L).concat(v.lights.filter(e=>e.L)).map(partOf);
  v.lights.filter(e=>!e.L).forEach(e=>pb.push(partOf(e)));
  if(baked)v.wheels.forEach(function(w){[-1,1].forEach(function(sx){wheelS(sx*w.x,w.z,s.r,s.ww).forEach(p=>pb.push(p));});});
  if(pb.length)g0.push(rawG(geo(pb)));
  if(pl.length)g1.push(rawG(geo(pl)));
  if(halo){
    const hl=v.lights.filter(e=>e.L&&e.c===0xff2d2d).map(e=>H(e.x,e.y,e.z+0.06,Math.max(0.5,(e.w||e.rad*2)*1.3),0xff2a1a));
    if(hl.length){const h=haloArr(hl);g2.push({P:h.P,C:h.C});}
  }
  return packGeo([g0,g1,g2]);
}
export const sedanGeo=c=>vehGeo(TRAFFIC.sedan(c),true,true);
export const vanGeo=(c,st)=>vehGeo(TRAFFIC.van(c,st),true,true);
export const truckGeo=(cargo,cab,stripe)=>vehGeo(TRAFFIC.truck(cargo,cab,stripe),true,true);
export const CARS=[
  {id:'pulga',name:'Pulga',price:0,accel:12,vmax:52},
  {id:'gt',name:'Evo R',price:400,accel:16,vmax:60},
  {id:'cupe',name:'Rotor 7',price:1200,accel:19,vmax:66},
  {id:'muscle',name:'Mark IV',price:2500,accel:26,vmax:64},
  {id:'veloce',name:'Quattro V10',price:5000,accel:21,vmax:74},
  {id:'hiper',name:'Touro X',price:9000,accel:24,vmax:84}
];
CARS.forEach(function(c){const s=CARSPEC[c.id];c.w=s.w;c.len=s.len;c.r=s.r;c.ww=s.ww;c.c=s.c;});
export const carById=id=>CARS.find(c=>c.id===id)||CARS[0];
export function makeCar(id){
  const s=CARSPEC[id]||CARSPEC.pulga, v=CKT.make(s), g=new THREE.Group();
  g.add(new THREE.Mesh(vehGeo(s,false,false,v),[M.vcol,M.lights,M.halo]));
  const wg=wheelGeo(s.r,s.ww), wheels=[];
  v.wheels.forEach(function(w){
    [-1,1].forEach(function(sx){
      const piv=new THREE.Group();piv.position.set(sx*w.x,s.r,w.z);
      const mesh=new THREE.Mesh(wg,M.vcol);piv.add(mesh);g.add(piv);
      wheels.push({piv:piv,mesh:mesh,front:w.front});
    });
  });
  const rw=v.wheels[v.wheels.length-1];
  g.userData={wheels:wheels,r:s.r,wx:rw.x,wz:rw.z};
  return g;
}
