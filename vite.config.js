import { defineConfig } from 'vite';

// two pages: the game (index.html) and the model gallery (gallery.html)
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      input: {
        main: 'index.html',
        gallery: 'gallery.html',
      },
    },
  },
});
