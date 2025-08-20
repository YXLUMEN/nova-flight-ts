import {createCleanObj, isMobile} from "../utils/uit.ts";

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: true,
    lowPowerMode: false,

    mbps: 1 / 50,

    enableCameraOffset: true,

    autoShoot: false,
    followPointer: true,
}));

if (isMobile()) {
    WorldConfig.lowPowerMode = true;
    WorldConfig.mbps = 1 / 20;
    WorldConfig.autoShoot = true;
}

export {WorldConfig}