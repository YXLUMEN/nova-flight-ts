import type {Plugin} from 'vite';

interface Option {
    prefix?: string;
    defines: Record<string, any>;
}

export function injectPlugin(options: Option): Plugin {
    const {prefix = '', defines} = options;

    const define: Record<string, string> = {};
    for (const [key, value] of Object.entries(defines)) {
        define[`${prefix}${key}`] = JSON.stringify(value);
    }

    return {
        name: 'nf-inject-plugin',
        enforce: 'pre',
        config() {
            return {define};
        },
        configResolved(config) {
            // worker 的 environment 在 configResolved 之后才创建
            if (!config.define) (config as any).define = {};
            for (const [key, value] of Object.entries(define)) {
                config.define![key] = value;
            }
        },
    }
}