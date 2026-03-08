import {config, status} from "../utils/uit.ts";

// @ts-expect-error
const isDev = import.meta.env.MODE === 'development';

const isServer = typeof window === 'undefined';

const DEFAULT_CONFIG = config({
    tick: 20,
    mbps: 0.05,
    per: 50,
    fps: 100,
    perFrame: 1000 / 100,
    version: '26v18',
    gameVersion: 8,
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

    renderHitBox: false,
});

export {DEFAULT_CONFIG, WorldConfig, isDev, isServer};