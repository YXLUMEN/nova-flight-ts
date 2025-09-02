import {createCleanObj} from "../utils/uit.ts";

const freezeConfig = createCleanObj({
    tick: 50,
    mbps: 0.02,
} as const);

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: true,
    lowPowerMode: false,

    tick: freezeConfig.tick,
    mbps: freezeConfig.mbps.valueOf(),

    enableCameraOffset: false,

    autoShoot: false,
    followPointer: true,
}));

export {freezeConfig, WorldConfig}