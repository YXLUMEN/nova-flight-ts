import {createCleanObj} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === "development";

const isServer = typeof window === 'undefined';

const freezeConfig = createCleanObj({
    tick: 20,
    mbps: 0.05,
    per: 50,
    version: '25w09c'
} as const);

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: isDev,
    usedDevMode: false,
    lowPowerMode: false,

    tick: freezeConfig.tick,
    mbps: freezeConfig.mbps,
    per: freezeConfig.per,

    enableCameraOffset: !isDev,

    follow: true,
    autoShoot: false,
    version: freezeConfig.version
}));

export {freezeConfig, WorldConfig, isDev, isServer};