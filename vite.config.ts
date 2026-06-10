import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

function copyDataPlugin() {
    return {
        name: 'copy-data',
        buildStart() {
            const srcDir = resolve(__dirname, 'data');
            const destDir = resolve(__dirname, 'frontend/public/data');
            mkdirSync(destDir, { recursive: true });
            copyFileSync(resolve(srcDir, 'all_nodes.json'), resolve(destDir, 'all_nodes.json'));
            const i18nSrc = resolve(srcDir, 'i18n');
            const i18nDest = resolve(destDir, 'i18n');
            if (existsSync(i18nSrc)) {
                mkdirSync(i18nDest, { recursive: true });
                // 只複製線上站實際載入的 i18n 檔；排除生成過程的中間/備份產物
                // （*_backup_*、*_mini_reviewed 等），避免把垃圾打包進 production。
                const isJunk = (name: string) => /backup|mini_reviewed/i.test(name);
                for (const f of readdirSync(i18nSrc)) {
                    if (f.endsWith('.json') && !isJunk(f)) {
                        copyFileSync(resolve(i18nSrc, f), resolve(i18nDest, f));
                    }
                }
            }
        },
    };
}

export default defineConfig({
    root: 'frontend',
    plugins: [copyDataPlugin()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'frontend/src'),
        },
    },
    server: {
        port: 3000,
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
