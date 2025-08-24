import {createCleanObj, isMobile} from "../utils/uit.ts";

const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: false,
    lowPowerMode: false,

    mbps: 1 / 50,

    enableCameraOffset: false,

    autoShoot: false,
    followPointer: true,
}));

if (isMobile()) {
    WorldConfig.lowPowerMode = true;
    WorldConfig.mbps = 1 / 20;
    WorldConfig.autoShoot = true;
}

export {WorldConfig}