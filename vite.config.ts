import {defineConfig,} from 'vite';

// @ts-expect-error process is a Node.js global
const env = process.env;

export default defineConfig({
    clearScreen: false,
    server: {
        watch: {
            ignored: ['**/src-tauri/**'],
        }
    },
    build: {
        outDir: 'dist',
        target:
            env.TAURI_ENV_PLATFORM === 'windows'
                ? 'chrome105'
                : 'safari13',
        // 在 debug 构建中不使用 minify
        minify: !env.TAURI_ENV_DEBUG ? 'terser' : false,
        // 在 debug 构建中生成 sourcemap
        sourcemap: !!env.TAURI_ENV_DEBUG,
        terserOptions: {
            compress: {
                drop_console: true,
                ecma: 2020
            },
            mangle: {
                properties: {
                    keep_quoted: 'strict',
                }
            }
        },
    },
});
