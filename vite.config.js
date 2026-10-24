import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* O build junta index.html, CSS e módulos JS num único dist/corrida.html (só para entrega).
   O three.js continua vindo do CDN, como na versão original. */
const renameToCorrida = {
  name: 'rename-to-corrida',
  enforce: 'post',
  generateBundle(_, bundle) {
    const html = bundle['index.html'];
    if (html) html.fileName = 'corrida.html';
  },
};

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [viteSingleFile(), renameToCorrida],
});
