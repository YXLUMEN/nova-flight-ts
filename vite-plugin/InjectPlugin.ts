import type {Plugin} from 'vite';

interface Option {
    prefix?: string;
    defines: Record<string, any>;
}

export function injectPlugin(options: Option): Plugin {
    const {prefix = '', defines} = options;

    return {
        name: 'nf-inject-plugin',
        enforce: 'pre',
        configResolved(config) {
            if (!config.define) (config as any).define = {};

            for (const [key, value] of Object.entries(defines)) {
                const fullKey = `${prefix}${key}`;
                config.define![fullKey] = JSON.stringify(value);
            }
        },
    }
}