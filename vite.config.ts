import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: 'frontend',
    resolve: {
        alias: {
            '@': resolve(__dirname, 'frontend/src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
            '/data': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'frontend/index.html'),
                app: resolve(__dirname, 'frontend/app.html'),
                explorer: resolve(__dirname, 'frontend/explorer.html'),
            },
        },
    },
});
