/* Salvamento (localStorage) */
import {CARS} from './vehicles.js';

/* ------------------------------------------------------------------ */
/* Salvamento                                                          */
/* ------------------------------------------------------------------ */
const SAVE_KEY='corrida-procedural-save-v1';
export let save={coins:0,owned:['pulga'],car:'pulga',best:0,records:[]};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&typeof s==='object')save=Object.assign(save,s);}catch(e){}
if(!Array.isArray(save.owned)||!save.owned.length)save.owned=['pulga'];
if(!Array.isArray(save.records))save.records=[];
/* maior distância já percorrida (marcada na pista com uma placa); saves antigos usam os recordes */
if(typeof save.bestD!=='number')save.bestD=save.records.reduce((m,r)=>Math.max(m,r.d||0),0);
if(!save.owned.includes(save.car)||!CARS.some(c=>c.id===save.car))save.car='pulga';
export const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}};
