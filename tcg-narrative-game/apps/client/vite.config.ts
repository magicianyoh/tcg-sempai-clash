import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: './',
    server: {
        host: '0.0.0.0',
        port: 8080
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
