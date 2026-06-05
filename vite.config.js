import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Gorent Admin — Vite + React.
// The prototype was authored as a single shared global scope (React UMD + Babel
// standalone). It is ported here into one module (src/main.jsx) so the bare
// cross-references and `window.*` lookups keep working exactly as designed.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
});
