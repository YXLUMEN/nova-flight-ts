import {defineConfig,} from 'vite';


export default defineConfig({
    base: './',
    build: {
        outDir: 'dist',
        minify: 'terser',
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
