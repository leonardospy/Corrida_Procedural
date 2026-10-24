/* Atalhos do DOM e verificação do THREE */

export const $=id=>document.getElementById(id);
export const game=$('game'), canvas=$('c');
export const fail=msg=>{const e=$('err');e.textContent=msg;e.hidden=false;};
if(typeof THREE==='undefined'){fail('Não foi possível carregar o motor 3D. Verifique a conexão e recarregue a página.');throw new Error('Corrida: inicialização interrompida');}
