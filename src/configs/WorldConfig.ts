import {createClean} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === "development";

const isServer = typeof window === 'undefined';

const freezeConfig = createClean({
    tick: 20,
    mbps: 0.05,
    per: 50,
    version: '25w12a'
} as const);

const WorldConfig = Object.preventExtensions(createClean({
    devMode: isDev,
    usedDevMode: false,
    lowPowerMode: false,

    tick: freezeConfig.tick,
    mbps: freezeConfig.mbps,
    per: freezeConfig.per,

    enableCameraOffset: !isDev,

    follow: true,
    autoShoot: false,
    version: freezeConfig.version,
    port: 25566,
    serverAddr: '127.0.0.1:25566',
}));

export {freezeConfig, WorldConfig, isDev, isServer};