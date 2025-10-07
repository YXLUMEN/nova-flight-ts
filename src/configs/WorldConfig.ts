import {createCleanObj} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === "development";

const isServer = typeof window === 'undefined';

const freezeConfig = createCleanObj({
    tick: 20,
    mbps: 0.05,
} as const);

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: isDev,
    usedDevMode: false,
    lowPowerMode: false,

    tick: freezeConfig.tick,
    mbps: freezeConfig.mbps.valueOf(),

    enableCameraOffset: !isDev,

    autoShoot: false,
    readSave: false,
}));

export {freezeConfig, WorldConfig, isDev, isServer};