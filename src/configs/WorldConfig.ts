import {createCleanObj, isMobile} from "../utils/uit.ts";

export const WorldConfig = Object.preventExtensions(createCleanObj({
    devMode: true,
    lowPowerMode: isMobile(),

    mbps: 1 / 50,
    lowMbps: 1 / 20,

    enableCameraOffset: true,

    autoShoot: false,
    followPointer: true,
}));
