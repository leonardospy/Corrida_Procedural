/* Converte um carro .glb (cores lisas por material) no formato do jogo: src/js/models/<nome>.js
   Uso: node tools/glb2car.mjs assets/models/ry7.glb ry7 [--info]
   - aplica as transformações dos nós, põe o carro de frente para -z, com o chão em y=0 e o comprimento pedido
   - separa as 4 rodas (para girarem) e classifica cada material pelo papel (lataria, vidro, farol, lanterna...)
   O arquivo gerado é texto comum: cores e papéis ficam no topo e podem ser editados à mão. */
import fs from 'node:fs';
import path from 'node:path';

const [src, name, flag] = process.argv.slice(2);
const CFG = {
  length: 4.3,                       // comprimento final do carro em metros
  floor: /floor/i,                   // nós ignorados (piso da cena do Sketchfab)
  head: 'Material_14',               // material dos faróis: diz onde é a frente
  /* papel de cada material no jogo (o resto vira 'trim'):
     body = lataria (pode ser repintada), glass, head = farol, tail = lanterna, signal = pisca (os três últimos acendem) */
  roles: { '02_-_Default': 'body', Material_9: 'body', Material_14: 'head', Material_2: 'signal', Material_3: 'glass', Material_4: 'glass', Material_5: 'glass' },
  /* o mesmo material pode ter papéis diferentes conforme a posição: o vermelho atrás são as lanternas, nas rodas são as pinças */
  split: [{ mat: 'Material_1', as: 'Material_1_lanterna', role: 'tail', when: (c) => c[2] > 1.6 }]
};

const buf = fs.readFileSync(src);
const jl = buf.readUInt32LE(12), J = JSON.parse(buf.slice(20, 20 + jl).toString());
const binStart = 20 + jl + 8, BIN = buf.slice(binStart);

/* ---------- matrizes 4x4 (coluna maior, como no glTF) ---------- */
const I4 = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c*4+r] += a[k*4+r] * b[c*4+k]; return o; }
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0,0,0], q = n.rotation || [0,0,0,1], s = n.scale || [1,1,1];
  const [x,y,z,w] = q;
  return [(1-2*(y*y+z*z))*s[0], 2*(x*y+z*w)*s[0], 2*(x*z-y*w)*s[0], 0,
          2*(x*y-z*w)*s[1], (1-2*(x*x+z*z))*s[1], 2*(y*z+x*w)*s[1], 0,
          2*(x*z+y*w)*s[2], 2*(y*z-x*w)*s[2], (1-2*(x*x+y*y))*s[2], 0, t[0], t[1], t[2], 1];
}
const apply = (m, p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];

function accessor(i) {
  const a = J.accessors[i], bv = J.bufferViews[a.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || 0, out = [];
  const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType];
  const rd = { 5126: (o) => BIN.readFloatLE(o), 5125: (o) => BIN.readUInt32LE(o), 5123: (o) => BIN.readUInt16LE(o), 5121: (o) => BIN.readUInt8(o) }[a.componentType];
  for (let k = 0; k < a.count; k++) { const base = off + k * (stride || comps * size), v = []; for (let c = 0; c < comps; c++) v.push(rd(base + c * size)); out.push(comps === 1 ? v[0] : v); }
  return out;
}

/* ---------- triângulos em coordenadas do mundo, com o material ---------- */
const tris = [];
(function walk(ni, parent) {
  const n = J.nodes[ni], m = mul(parent, trs(n));
  if (CFG.floor.test(n.name || '')) return;
  if (n.mesh !== undefined) for (const p of J.meshes[n.mesh].primitives) {
    const P = accessor(p.attributes.POSITION).map((v) => apply(m, v));
    const idx = p.indices !== undefined ? accessor(p.indices) : P.map((_, k) => k);
    const mat = J.materials[p.material];
    for (let k = 0; k < idx.length; k += 3) tris.push({ v: [P[idx[k]], P[idx[k+1]], P[idx[k+2]]], mat: mat.name });
  }
  (n.children || []).forEach((c) => walk(c, m));
})(J.scenes[J.scene || 0].nodes[0], I4());

const mats = {};
J.materials.forEach((m) => {
  const e = m.emissiveFactor || [0,0,0], b = (m.pbrMetallicRoughness || {}).baseColorFactor || [0,0,0,1];
  const c = m.extensions && m.extensions.KHR_materials_unlit ? e.map((x, k) => Math.min(1, x + b[k])) : b;
  mats[m.name] = c;
});

/* ---------- orientação: eixo mais longo vira z, faróis na frente (-z), chão em y=0 ---------- */
function bbox(list) { const lo = [1e9,1e9,1e9], hi = [-1e9,-1e9,-1e9]; list.forEach((t) => t.v.forEach((p) => { for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); } })); return { lo, hi }; }
let B = bbox(tris);
const ext = [0,1,2].map((a) => B.hi[a] - B.lo[a]);
if (ext[0] > ext[2]) tris.forEach((t) => t.v = t.v.map((p) => [p[2], p[1], -p[0]]));   // comprimento no x: gira 90°
const cen = (list) => { let s = [0,0,0], n = 0; list.forEach((t) => t.v.forEach((p) => { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++; })); return s.map((x) => x / n); };
B = bbox(tris);
const mid = B.lo.map((l, a) => (l + B.hi[a]) / 2);
const heads = tris.filter((t) => t.mat === CFG.head);
if (heads.length && cen(heads)[2] > mid[2]) tris.forEach((t) => t.v = t.v.map((p) => [-p[0], p[1], -p[2]]));   // faróis em +z: meia-volta
B = bbox(tris);
const sc = CFG.length / (B.hi[2] - B.lo[2]), c0 = B.lo.map((l, a) => (l + B.hi[a]) / 2);
tris.forEach((t) => t.v = t.v.map((p) => [(p[0] - c0[0]) * sc, (p[1] - B.lo[1]) * sc, (p[2] - c0[2]) * sc]));

/* ---------- peças: triângulos ligados por vértices em comum formam uma peça ---------- */
const key = (p) => p.map((x) => Math.round(x * 2000)).join(',');
const par = tris.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
const owner = new Map();
tris.forEach((t, i) => t.v.forEach((p) => { const k = key(p); if (owner.has(k)) { const a = find(owner.get(k)), b = find(i); if (a !== b) par[a] = b; } else owner.set(k, i); }));
const comps = {}; tris.forEach((t, i) => { const r = find(i); (comps[r] = comps[r] || []).push(t); });

/* ---------- rodas: as peças grandes, redondas e encostadas no chão, uma em cada canto ---------- */
const isWheel = (l) => { const b = bbox(l), d = b.hi[1] - b.lo[1]; return l.length > 100 && b.lo[1] < 0.05 && d > 0.4 && Math.abs((b.hi[2] - b.lo[2]) - d) < 0.12 * d; };
const wheelParts = Object.values(comps).filter(isWheel).map((l) => { const b = bbox(l); return { tris: l, b, c: b.lo.map((x, a) => (x + b.hi[a]) / 2) }; });
if (wheelParts.length !== 4) { console.error('esperava 4 rodas, achei', wheelParts.length); process.exit(1); }
const inWheel = new Set(wheelParts.flatMap((w) => w.tris));
/* molde: a roda traseira esquerda (as dianteiras do modelo vêm esterçadas) */
const tmpl = wheelParts.filter((w) => w.c[2] > 0 && w.c[0] < 0)[0];
const wr = (tmpl.b.hi[1] - tmpl.b.lo[1]) / 2, ww = tmpl.b.hi[0] - tmpl.b.lo[0];
const axle = (front) => { const l = wheelParts.filter((w) => (w.c[2] < 0) === front); return [l.reduce((s, w) => s + Math.abs(w.c[0]), 0) / 2, l.reduce((s, w) => s + w.c[2], 0) / 2]; };
const [fx, fz] = axle(true), [rx, rz] = axle(false);
/* freios (disco, pinça, cubo): peças pequenas dentro do vão de cada roda. Os da frente vêm esterçados junto com
   as rodas do modelo e atravessariam a roda reta; são trocados por cópias dos traseiros do mesmo lado */
const nearWheel = (l, w) => { const c = cen(l); return Math.sign(c[0]) === Math.sign(w.c[0]) && Math.abs(Math.abs(c[0]) - Math.abs(w.c[0])) < 0.35 && Math.hypot(c[1] - w.c[1], c[2] - w.c[2]) < wr * 1.1; };
const brakeOf = (front) => Object.values(comps).filter((l) => !inWheel.has(l[0]) && wheelParts.some((w) => (w.c[2] < 0) === front && nearWheel(l, w)));
const dropFront = new Set(brakeOf(true).flat());
const copies = brakeOf(false).flat().map((t) => ({ mat: t.mat, v: t.v.map((p) => [p[0] + Math.sign(p[0]) * (fx - rx), p[1], p[2] + (fz - rz)]) }));
for (let i = tris.length - 1; i >= 0; i--) if (dropFront.has(tris[i])) tris.splice(i, 1);
tris.push(...copies);

/* ---------- papéis por posição (ex.: vermelho de trás = lanterna) ---------- */
const roles = Object.assign({}, CFG.roles);
const body = tris.filter((t) => !inWheel.has(t)).map((t) => {
  const s = CFG.split.find((r) => r.mat === t.mat && r.when(cen([t])));
  if (s) { roles[s.as] = s.role; mats[s.as] = mats[t.mat]; return { v: t.v, mat: s.as }; }
  return t;
});

if (flag === '--info') {
  const by = {}; body.forEach((t) => { (by[t.mat] = by[t.mat] || []).push(t); });
  Object.entries(by).forEach(([m, l]) => console.log(m.padEnd(22), (roles[m] || 'trim').padEnd(6), String(l.length).padStart(5), 'cor', mats[m].map((x) => x.toFixed(2)).join(','), 'centro', cen(l).map((x) => x.toFixed(2)).join(',')));
  console.log('rodas: raio', wr.toFixed(3), 'largura', ww.toFixed(3), 'dianteiras x', fx.toFixed(2), 'z', fz.toFixed(2), 'traseiras x', rx.toFixed(2), 'z', rz.toFixed(2), 'molde', tmpl.tris.length, 'triângulos');
  console.log('carroceria', body.length, 'triângulos');
  process.exit(0);
}

/* ---------- saída: módulo JS legível (posições em milímetros) ---------- */
const hex = (c) => '0x' + c.slice(0, 3).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const mm = (x) => Math.round(x * 1000);
const r3 = (x) => Math.round(x * 1000) / 1000;
function groups(list, off) {
  const by = {}; list.forEach((t) => { (by[t.mat] = by[t.mat] || []).push(t); });
  return Object.entries(by).map(([m, l]) => '  {mat:' + JSON.stringify(m) + ',pos:[' + l.map((t) => t.v.map((p) => [mm(p[0] - off[0]), mm(p[1] - off[1]), mm(p[2] - off[2])].join(',')).join(',')).join(',') + ']}').join(',\n');
}
const ex = (J.asset && J.asset.extras) || {};
const used = [...new Set(body.map((t) => t.mat).concat(tmpl.tris.map((t) => t.mat)))];
const lines = [];
lines.push('/* Gerado por tools/glb2car.mjs a partir de ' + path.basename(src) + ' (rode de novo depois de editar o .glb: npm run models).');
if (ex.title) lines.push('   Modelo: "' + ex.title + '" por ' + ex.author + ', licença ' + ex.license + '. Fonte: ' + ex.source);
lines.push('   Frente em -z, chão em y=0. Posições em milímetros, 3 números por vértice, 3 vértices por triângulo. */');
lines.push('export const META={length:' + CFG.length + ',wheelR:' + r3(wr) + ',wheelW:' + r3(ww) + ',front:[' + r3(fx) + ',' + r3(fz) + '],rear:[' + r3(rx) + ',' + r3(rz) + ']};');
lines.push('/* cor e papel de cada material — dá para editar aqui: body (lataria), glass, head (farol), tail (lanterna), signal (pisca), trim (resto) */');
lines.push('export const MATS={');
used.forEach((m) => lines.push('  ' + JSON.stringify(m) + ':{color:' + hex(mats[m]) + ',role:' + JSON.stringify(roles[m] || 'trim') + '},'));
lines.push('};');
lines.push('export const BODY=[\n' + groups(body, [0, 0, 0]) + '\n];');
lines.push('/* roda esquerda centrada no próprio eixo; o jogo espelha para a direita e repete nas quatro posições */');
lines.push('export const WHEEL=[\n' + groups(tmpl.tris, tmpl.c) + '\n];');
const out = path.join('src', 'js', 'models', name + '.js');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log('gerado', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB', '| carroceria', body.length, '| roda', tmpl.tris.length, 'triângulos');
