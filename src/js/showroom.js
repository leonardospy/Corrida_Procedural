/* Showroom do menu */
import {SHOW_Z} from './config.js';
import {M,scene} from './scene.js';

/* ------------------------------------------------------------------ */
/* Showroom do menu                                                    */
/* ------------------------------------------------------------------ */
export const show=new THREE.Group();show.position.set(0,0,SHOW_Z);scene.add(show);
const floor=new THREE.Mesh(new THREE.CircleGeometry(40,24),M.stage);floor.rotation.x=-Math.PI/2;floor.position.y=-0.01;show.add(floor);
const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.6,0.36,20),M.pedestal);pedestal.position.y=0.18;show.add(pedestal);
const rim=new THREE.Mesh(new THREE.CylinderGeometry(3.45,3.45,0.05,20),M.rim);rim.position.y=0.37;show.add(rim);
const beam=new THREE.Mesh(new THREE.ConeGeometry(4.4,11,28,1,true),M.beam);beam.position.y=5.9;show.add(beam);
show.visible=false;
