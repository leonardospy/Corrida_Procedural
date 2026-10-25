# Corrida Procedural

Jogo de corrida 3D em three.js (r128, carregado do CDN), com pista gerada proceduralmente.

## Estrutura

```
index.html            página de desenvolvimento (carrega os módulos)
src/css/              base, hud, ui (botões), menu, overlay (pausa/fim)
src/js/
  main.js             laço principal e inicialização
  shared.js           ST: estado que vários módulos alteram (ST.dist, ST.speed, ST.state...)
  dom.js config.js    DOM, ajustes do jogador, parâmetros e funções matemáticas
  scene.js            renderer, cena, materiais, luzes, paletas e céu
  geometry.js         utilitários de malha low poly
  vehicles.js         carrocerias, carros do jogador e trânsito
  obstacles.js        modelos de obstáculos, animais, cidade, pórticos
  scenery.js          placas, outdoors e nuvens
  track.js            pista: malhas instanciadas, cidade e mata
  tunnels.js          túneis na mata, passagens subterrâneas na cidade, trechos sem placas
  post.js             estilo gráfico Desenho (contornos e cores vivas; escolha em Ajustes)
  boss.js             chefes em distâncias fixas (lista BOSSES); hoje: Polícia aos 20 km, por 5 km
  generator.js        gerador procedural de obstáculos e moedas
  physics.js          movimento, colisões, saltos e coleta
  race.js             início/fim da corrida, pausa, batidas
  render.js           mundo, câmera e redimensionamento
  input.js            teclado, toque e botões
  effects.js audio.js hud.js menu.js save.js player.js showroom.js state.js
corrida_v1.html       versão original em arquivo único (não editar)
Carros 01.js          modelos de carro anteriores (cópia de src/js/vehicles.js antes da versão 2)
```

Variáveis que só um módulo altera ficam nele (`export let`) e os outros só leem.
As que vários módulos alteram ficam em `ST` (`src/js/shared.js`).

## Carros importados (.glb)

O RY 7 vem de um modelo 3D: `assets/models/ry7.glb`. Para editar, abra o `.glb` no Blender, salve por cima
e gere de novo o módulo do jogo:

```bash
npm run models
```

O conversor ([tools/glb2car.mjs](tools/glb2car.mjs)) põe o carro de frente para -z, com o chão em y=0 e 4,3 m de
comprimento, separa as rodas (para girarem) e grava `src/js/models/ry7.js`. No topo desse arquivo dá para trocar a
cor e o papel de cada material (lataria, vidro, farol, lanterna, pisca). Para conferir as peças de um `.glb`:
`npm run dev` e abra `/tools/viewer.html?f=/assets/models/ry7.glb`.

Crédito: "Mazda RX7 Stylised", de SheldonJ99 (https://sketchfab.com/3d-models/mazda-rx7-stylised-898e9be8c8964f6298188a2901216e80),
licença CC BY 4.0.

## Desenvolver

ES modules não abrem via `file://`. Use o servidor local:

```bash
npm install
```

```bash
npm run dev
```

Abre em http://localhost:5173 e recarrega sozinho a cada alteração salva.

## Gerar o arquivo único (entrega)

```bash
npm run build
```

Gera `dist/corrida.html` com todo o CSS e JS embutidos (o three.js e a fonte continuam vindo da internet).
Para conferir: `npm run preview`.

## GitHub Pages (link fixo de teste)

O Pages serve o `index.html` e os módulos direto do repositório, sem build. Cada push atualiza o link
`https://<seu-usuário>.github.io/<repositório>/` em cerca de 1 minuto.

1. Instale o Git: `winget install --id Git.Git -e` (ou https://git-scm.com).
2. Crie um repositório vazio no GitHub (público: o Pages gratuito exige repositório público).
3. Nesta pasta:
   ```bash
   git init -b main
   git add .
   git commit -m "Corrida Procedural modular"
   git remote add origin https://github.com/<seu-usuário>/<repositório>.git
   git push -u origin main
   ```
4. No GitHub: Settings → Pages → Source: *Deploy from a branch* → Branch `main`, pasta `/ (root)` → Save.

Os saves ficam no `localStorage` de cada endereço: localhost, Pages e o arquivo único têm moedas e recordes separados.
