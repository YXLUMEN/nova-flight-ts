import {config, status} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === 'development';

const isServer = typeof window === 'undefined';

const defaultConfig = config({
    tick: 20,
    mbps: 0.05,
    per: 50,
    fps: 75,
    perFrame: 1000 / 75,
    version: '26v06'
});

const WorldConfig = status({
    lowPowerMode: false,

    tick: defaultConfig.tick,
    mbps: defaultConfig.mbps,
    per: defaultConfig.per,

    lastFps: defaultConfig.fps.valueOf(),
    fps: defaultConfig.fps.valueOf(),
    perFrame: defaultConfig.perFrame.valueOf(),

    enableCameraOffset: !isDev,

    follow: true,
    autoShoot: false,
    version: defaultConfig.version,
    port: 25566,
    serverAddr: '127.0.0.1:25566',
});

export {defaultConfig, WorldConfig, isDev, isServer};