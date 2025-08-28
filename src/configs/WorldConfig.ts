import {createCleanObj, isMobile} from "../utils/uit.ts";

const freezeConfig = createCleanObj({
    tick: 50,
    mbps: 0.02,
} as const);

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: true,
    lowPowerMode: false,

    tick: freezeConfig.tick.valueOf(),
    mbps: freezeConfig.mbps.valueOf(),

    enableCameraOffset: true,

    autoShoot: false,
    followPointer: true,
}));

if (isMobile()) {
    WorldConfig.lowPowerMode = true;
    WorldConfig.tick = 20;
    WorldConfig.mbps = 1 / 20;
    WorldConfig.autoShoot = true;
}

export {freezeConfig, WorldConfig}