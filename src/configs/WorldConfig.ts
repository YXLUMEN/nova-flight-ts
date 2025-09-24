import {createCleanObj} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === "development";

const freezeConfig = createCleanObj({
    tick: 50,
    mbps: 0.02,
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

export {freezeConfig, WorldConfig, isDev}