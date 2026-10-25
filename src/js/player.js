/* Modelo do carro do jogador */
import {ST} from './shared.js';
import {$} from './dom.js';
import {M,scene} from './scene.js';
import {carById,makeCar} from './vehicles.js';
import {save} from './save.js';

/* ------------------------------------------------------------------ */
/* Jogador                                                             */
/* ------------------------------------------------------------------ */
export let car=null,carId='';ST.cur=carById(save.car);
/* cor escolhida na loja para cada carro (undefined = original) */
export const carColor=id=>save.colors&&save.colors[id]!==undefined?save.colors[id]:undefined;
export function showCarModel(id){
  const col=carColor(id), key=id+':'+col;
  if(car&&carId===key)return;
  if(car){scene.remove(car);car.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  car=makeCar(id,col);carId=key;scene.add(car);
  const c=carById(id);
  M.deb.color.setHex(col!==undefined?col:c.c);
  $('showName').textContent=c.name;
  $('showStats').textContent=Math.round(c.vmax*3.6)+' km/h · acel. '+c.accel+' m/s²';
}
export const blob=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.01,4.4),M.blob);scene.add(blob);
export const dizzy=new THREE.Group();
for(let i=0;i<3;i++)dizzy.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.17,0),M.star));
dizzy.visible=false;scene.add(dizzy);
