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
            ecma: 2025,
            compress: {
                drop_console: true,
                drop_debugger: true,
                passes: 2,
            },
        },
    },
    plugins: [serverFlagPlugin(false)],
    worker: {
        format: 'es',
        plugins: () => [serverFlagPlugin(true)]
    }
});

function serverFlagPlugin(value: boolean) {
    return {
        name: 'server-flag',
        enforce: 'pre',
        transform(code: string) {
            return {
                code: code.replace(/__IS_SERVER__/g, value ? 'true' : 'false'),
                map: null,
            }
        },
    }
}