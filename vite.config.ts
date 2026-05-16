import {defineConfig} from 'vite';

// @ts-expect-error process is a Node.js global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    clearScreen: false,
    server: {
        port: 5173,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 5173,
            }
            : undefined,
        watch: {
            ignored: ['**/src-tauri/**'],
        }
    },
    build: {
        outDir: 'dist',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                ecma: 2020
            },
        },
    },
    worker: {
        format: 'es'
    }
});
