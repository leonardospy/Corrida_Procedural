/* Menu, loja, recordes e ajustes */
import {ST} from './shared.js';
import {$} from './dom.js';
import {CFG_KEY,CFG_UI,cfg,fmt} from './config.js';
import {beaconL,lampL} from './scene.js';
import {CARS,carById} from './vehicles.js';
import {persist,save} from './save.js';
import {carColor,showCarModel} from './player.js';
import {audioInit,blip,master} from './audio.js';
import {startRun} from './race.js';
import {resize} from './render.js';

/* ------------------------------------------------------------------ */
/* Menu, loja e recordes                                               */
/* ------------------------------------------------------------------ */
export const panels={main:$('pMain'),shop:$('pShop'),records:$('pRec'),cfg:$('pCfg'),quit:$('pQuit')};
ST.shopSel=save.car;
function renderWallet(){$('wallet').textContent=fmt(save.coins);}
function renderShop(){
  const el=$('shopList');el.innerHTML='';
  CARS.forEach(c=>{
    const owned=save.owned.includes(c.id), eq=save.car===c.id;
    const art=document.createElement('article');
    art.className='car';art.dataset.id=c.id;art.tabIndex=0;
    art.setAttribute('aria-selected',String(ST.shopSel===c.id));
    art.innerHTML='<div><h3>'+c.name+'</h3><div class="st"><span>Aceleração</span><i style="--v:'+Math.round(c.accel/26*100)+'%"></i></div><div class="st"><span>'+Math.round(c.vmax*3.6)+' km/h</span><i style="--v:'+Math.round(c.vmax/84*100)+'%"></i></div></div>';
    const b=document.createElement('button');b.type='button';b.className='btn sm';b.dataset.id=c.id;
    if(eq){b.textContent='Em uso';b.disabled=true;b.className+=' alt';b.dataset.act='none';}
    else if(owned){b.textContent='Usar';b.dataset.act='use';}
    else{b.dataset.act='buy';b.innerHTML='Comprar <span class="cn"></span>'+fmt(c.price);b.disabled=save.coins<c.price;}
    art.appendChild(b);
    /* pintura: só no carro selecionado e já comprado */
    if(ST.shopSel===c.id&&owned){
      const row=document.createElement('div');row.className='paint';row.setAttribute('role','radiogroup');row.setAttribute('aria-label','Cor do '+c.name);
      const cap=document.createElement('span');cap.textContent='Cor';row.appendChild(cap);
      const now=carColor(c.id);
      PAINTS.forEach(function(p){
        const s=document.createElement('button');s.type='button';s.dataset.paint=p[1]===null?'orig':String(p[1]);
        s.setAttribute('role','radio');s.setAttribute('aria-label',p[0]);s.title=p[0];
        s.setAttribute('aria-checked',String(p[1]===null?now===undefined:now===p[1]));
        s.style.setProperty('--sw','#'+(p[1]===null?c.c:p[1]).toString(16).padStart(6,'0'));
        if(p[1]===null)s.className='orig';
        row.appendChild(s);
      });
      art.appendChild(row);
    }
    el.appendChild(art);
  });
}
/* cores da loja; "Original" volta para a cor de fábrica do carro */
const PAINTS=[['Original',null],['Vermelho',0xd8263a],['Laranja',0xff7a1a],['Amarelo',0xffc24a],['Verde',0x2a9d4f],['Azul-piscina',0x2ec4b6],
  ['Azul',0x2f6fd6],['Roxo',0x7c4fd8],['Rosa',0xff5fa2],['Branco',0xf4f1ea],['Prata',0xb8bec8],['Grafite',0x4a4e58],['Preto',0x1b1d24]];
function renderRecords(){
  const el=$('recList');el.innerHTML='';
  if(!save.records.length){const li=document.createElement('li');li.innerHTML='<span class="n">–</span><span class="empty">Nenhuma corrida ainda. Dê uma volta e volte aqui.</span>';el.appendChild(li);return;}
  save.records.forEach((r,i)=>{
    const li=document.createElement('li');
    li.innerHTML='<span class="n">'+(i+1)+'</span><div><b>'+fmt(r.s)+'</b><small>'+fmt(r.d)+' m · '+r.k+' moedas · '+r.c+'</small></div>';
    el.appendChild(li);
  });
}
export function showPanel(name){
  for(const k in panels)panels[k].hidden=(k!==name);
  $('show').hidden=!(name==='main'||name==='records');
  if(name==='cfg')renderCfg();
  $('wallet').parentElement.hidden=(name==='quit');
  $('mcol').scrollTop=0;
  if(name==='shop'){ST.shopSel=save.car;renderShop();}
  if(name==='records')renderRecords();
  if(name!=='shop')showCarModel(save.car);
  renderWallet();
}
function persistCfg(){try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg));}catch(e){}}
export function applyCfg(){
  ST.STAGE_M=Math.max(100,cfg.stage);
  const S=Math.round(cfg.lampN);
  lampL.forEach(function(l,j){l.visible=j<S;});
  beaconL.visible=S>0;
  if(master)master.gain.value=ST.muted?0:0.7*cfg.vol/100;
  resize();
}
function renderCfg(){
  const el=$('cfgList');el.innerHTML='';
  CFG_UI.forEach(function(u){
    if(u.k==='style'){
      /* gráficos: dois botões lado a lado, no topo da lista */
      const box=document.createElement('div');box.className='seg';box.setAttribute('role','radiogroup');box.setAttribute('aria-label',u.t);
      const cap=document.createElement('span');cap.className='seg-cap';cap.textContent='Gráficos';box.appendChild(cap);
      [['Realista',0],['Desenho',1]].forEach(function(o){
        const b=document.createElement('button');b.type='button';b.textContent=o[0];b.setAttribute('role','radio');
        b.setAttribute('aria-checked',String((cfg.style>=0.5?1:0)===o[1]));
        b.addEventListener('click',function(){const st=$('mcol').scrollTop;cfg.style=o[1];persistCfg();applyCfg();renderCfg();$('mcol').scrollTop=st;});
        box.appendChild(b);
      });
      el.appendChild(box);
      return;
    }
    const row=document.createElement('label');row.className='row';
    const nm=document.createElement('span');nm.textContent=u.t;
    const out=document.createElement('output');out.textContent=u.f(cfg[u.k]);
    const inp=document.createElement('input');
    inp.type='range';inp.min=u.min;inp.max=u.max;inp.step=u.step;inp.value=cfg[u.k];
    inp.setAttribute('aria-label',u.t);
    inp.addEventListener('input',function(){
      cfg[u.k]=+inp.value;out.textContent=u.f(cfg[u.k]);
      if(u.k!=='res')applyCfg();
    });
    inp.addEventListener('change',function(){persistCfg();applyCfg();});
    row.appendChild(nm);row.appendChild(out);row.appendChild(inp);el.appendChild(row);
  });
}
$('cfgReset').addEventListener('click',function(){
  CFG_UI.forEach(function(u){cfg[u.k]=u.def;});
  persistCfg();applyCfg();renderCfg();
});
$('menu').addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');if(!b)return;
  const go=b.dataset.go;
  audioInit();
  if(go==='play')startRun();
  else if(go==='bosstest')startRun(true);
  else if(go==='quit'){try{window.close();}catch(x){}showPanel('quit');}
  else showPanel(go);
});
$('shopList').addEventListener('click',e=>{
  const art=e.target.closest('.car');if(!art)return;
  const id=art.dataset.id, sw=e.target.closest('[data-paint]');
  if(sw){
    save.colors=save.colors||{};
    if(sw.dataset.paint==='orig')delete save.colors[id];else save.colors[id]=+sw.dataset.paint;
    persist();showCarModel(id);renderShop();
    const again=$('shopList').querySelector('.car[data-id="'+id+'"] [data-paint="'+sw.dataset.paint+'"]');if(again)again.focus();
    return;
  }
  const btn=e.target.closest('button');
  if(btn&&!btn.disabled){
    const c=carById(id);
    if(btn.dataset.act==='buy'&&save.coins>=c.price&&!save.owned.includes(id)){
      save.coins-=c.price;save.owned.push(id);save.car=id;ST.cur=c;persist();
      audioInit();blip(660,1320,0.2,'square',0.08);
    }else if(btn.dataset.act==='use'&&save.owned.includes(id)){
      save.car=id;ST.cur=c;persist();
    }
    renderWallet();
  }
  ST.shopSel=id;showCarModel(id);renderShop();
});
$('shopList').addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('car')){
    e.preventDefault();ST.shopSel=e.target.dataset.id;showCarModel(ST.shopSel);renderShop();
  }
});
