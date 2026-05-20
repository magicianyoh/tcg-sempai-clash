import { defineConfig } from 'vite';
import path from 'path';

const clientPort = Number(process.env.VITE_PORT || 8080);
const backendPort = Number(process.env.VITE_BACKEND_PORT || process.env.BACKEND_PORT || process.env.PORT || 3000);
const backendTarget = `http://127.0.0.1:${backendPort}`;
const apiProxy = {
    target: backendTarget,
    changeOrigin: true,
};

export default defineConfig({
    root: './',
    server: {
        host: '0.0.0.0',
        port: clientPort,
        proxy: {
            '^/auth(?:/|$)': apiProxy,
            '/decks': apiProxy,
            '/prebuilt-decks': apiProxy,
            '/cards': apiProxy,
            '/cpu-match': apiProxy,
            '/ui-settings': apiProxy,
            '/wiki-content': apiProxy,
            '/health': apiProxy,
            '/ws': {
                ...apiProxy,
                ws: true,
            },
            '^/admin(?:/|$)': apiProxy,
        },
    },
    resolve: {
        alias: {
            '@tcg/shared': path.resolve(__dirname, '../../packages/shared'),
            '@tcg/game-engine': path.resolve(__dirname, '../../packages/game-engine/src')
        }
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                auth: path.resolve(__dirname, 'auth.html'),
                build: path.resolve(__dirname, 'build.html'),
                match: path.resolve(__dirname, 'match.html'),
                battle: path.resolve(__dirname, 'battle.html'),
                admin: path.resolve(__dirname, 'admin.html'),
                wiki: path.resolve(__dirname, 'wiki.html'),
            },
        },
    }
});
