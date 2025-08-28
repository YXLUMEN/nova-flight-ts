import {createCleanObj} from "../utils/uit.ts";

const freezeConfig = createCleanObj({
    tick: 50,
    mbps: 0.02,
} as const);

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: false,
    lowPowerMode: false,

    tick: freezeConfig.tick,
    mbps: freezeConfig.mbps.valueOf(),

    enableCameraOffset: true,

    autoShoot: false,
    followPointer: true,
}));

export {freezeConfig, WorldConfig}