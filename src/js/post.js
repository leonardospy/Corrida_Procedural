/* Estilo Desenho: a cena vai para uma textura e volta com contornos escuros e cores mais vivas */
import {camera,renderer,scene} from './scene.js';

let rt=null;
const size=new THREE.Vector2();
const quadScene=new THREE.Scene(), quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const mat=new THREE.ShaderMaterial({
  uniforms:{tC:{value:null},tD:{value:null},px:{value:new THREE.Vector2()},cn:{value:0.1},cf:{value:620}},
  depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
  fragmentShader:[
    'uniform sampler2D tC,tD;uniform vec2 px;uniform float cn,cf;varying vec2 vUv;',
    'float lin(vec2 uv){float z=texture2D(tD,uv).r*2.0-1.0;return 2.0*cn*cf/(cf+cn-z*(cf-cn));}',
    'void main(){',
    '  vec3 c=texture2D(tC,vUv).rgb;',
    '  float d=lin(vUv),e=0.0;',
    /* contorno onde a profundidade salta em relação aos vizinhos (silhuetas e quinas) */
    '  e=max(e,abs(lin(vUv+vec2(px.x,0.0))-d));e=max(e,abs(lin(vUv-vec2(px.x,0.0))-d));',
    '  e=max(e,abs(lin(vUv+vec2(0.0,px.y))-d));e=max(e,abs(lin(vUv-vec2(0.0,px.y))-d));',
    '  float edge=smoothstep(0.035,0.09,e/d)*(1.0-smoothstep(70.0,160.0,d));',
    '  float l=dot(c,vec3(0.299,0.587,0.114));',
    '  c=mix(vec3(l),c,1.38);c=pow(max(c,0.0),vec3(0.93));',
    '  c=mix(c,c*0.18+vec3(0.02,0.01,0.05),edge*0.9);',
    '  gl_FragColor=vec4(c,1.0);',
    '}'].join('\n')
});
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));

function ensureTarget(){
  renderer.getDrawingBufferSize(size);
  if(rt&&rt.width===size.x&&rt.height===size.y)return;
  if(rt){rt.depthTexture.dispose();rt.dispose();}
  rt=new THREE.WebGLRenderTarget(size.x,size.y);
  rt.depthTexture=new THREE.DepthTexture(size.x,size.y);
  rt.depthTexture.type=THREE.UnsignedIntType;
  mat.uniforms.tC.value=rt.texture;mat.uniforms.tD.value=rt.depthTexture;
  mat.uniforms.px.value.set(1/size.x,1/size.y);
}
export function renderFrame(toon){
  if(!toon){renderer.render(scene,camera);return;}
  ensureTarget();
  mat.uniforms.cn.value=camera.near;mat.uniforms.cf.value=camera.far;
  renderer.setRenderTarget(rt);renderer.render(scene,camera);
  renderer.setRenderTarget(null);renderer.render(quadScene,quadCam);
}
