import {config, status} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === 'development';

const isServer = typeof window === 'undefined';

const DEFAULT_CONFIG = config({
    tick: 20,
    mbps: 0.05,
    per: 50,
    fps: 75,
    perFrame: 1000 / 75,
    version: '26v09',
    gameVersion: 1,
});

const WorldConfig = status({
    lowPowerMode: false,

    tick: DEFAULT_CONFIG.tick,
    mbps: DEFAULT_CONFIG.mbps,
    per: DEFAULT_CONFIG.per,

    lastFps: DEFAULT_CONFIG.fps.valueOf(),
    fps: DEFAULT_CONFIG.fps.valueOf(),
    perFrame: DEFAULT_CONFIG.perFrame.valueOf(),

    enableCameraOffset: !isDev,

    follow: true,
    autoShoot: false,
    version: DEFAULT_CONFIG.version,
    port: 25566,
    serverAddr: '127.0.0.1:25566',
});

export {DEFAULT_CONFIG, WorldConfig, isDev, isServer};