import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: './',
    server: {
        port: 8080
    },
    resolve: {
        alias: {
            '@tcg/shared': path.resolve(__dirname, '../../packages/shared'),
            '@tcg/game-engine': path.resolve(__dirname, '../../packages/game-engine/src')
        }
    },
    build: {
        outDir: 'dist'
    }
});
