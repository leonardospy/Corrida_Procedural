/* Estado da corrida */
import {ST} from './shared.js';
import {LEVEL_M} from './config.js';

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */
ST.state='menu';   // menu | play | paused | crash | over
ST.dist=0;ST.speed=0;ST.lane=1;ST.px=0;ST.coins=0;ST.topSpeed=0;ST.crashT=0;ST.shake=0;
ST.carY=0;ST.carVy=0;ST.carVx=0;ST.carSpin=0;ST.carRz=0;ST.carRx=0;
ST.airborne=false;ST.hop=false;ST.carPitch=0;ST.rampY=0;ST.jumpD0=0;
export const GJ=26;
ST.hits=0;ST.inv=0;ST.confuse=0;ST.deathCause='hit';ST.runSaved=true;
ST.lastLevel=1;ST.lastStage=0;ST.gantryNext=LEVEL_M;ST.spin=0;ST.menuK=1;ST.smokeAcc=0;
export const obstacles=[], coinList=[], wrenchList=[], fuelList=[], pools={};
ST.fuel=100;   /* combustível de 0 a 100 */
