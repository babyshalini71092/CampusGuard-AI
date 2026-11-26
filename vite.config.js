import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Large model/OCR binaries are re-read from disk on each load; telling the
// browser not to cache them avoids cache-write failures in constrained
// preview environments while keeping all data local to the page.
const noStore = {
  name: 'no-store-large-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (/\/(models|ort|tesseract)\//.test(req.url || '')) res.setHeader('Cache-Control', 'no-store');
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      if (/\/(models|ort|tesseract)\//.test(req.url || '')) res.setHeader('Cache-Control', 'no-store');
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), noStore],
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    testTimeout: 30000,
  },
});
