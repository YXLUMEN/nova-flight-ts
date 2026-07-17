import {defineConfig} from "vite";
import {injectPlugin} from "./vite-plugin/InjectPlugin";
import InlineEnum from 'unplugin-inline-enum/vite';

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
    define: {},
    plugins: [
        injectPlugin({
            defines: {
                __IS_SERVER__: false
            }
        }),
        InlineEnum()
    ],
    worker: {
        format: 'es',
        plugins: () => [
            injectPlugin({
                defines: {
                    __IS_SERVER__: true
                }
            }),
            InlineEnum()
        ]
    }
});