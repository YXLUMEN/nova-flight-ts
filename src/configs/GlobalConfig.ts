import {config, status} from "../utils/uit.ts";

// @ts-expect-error
export const isDev = import.meta.env.MODE === 'development';

export const isServer = typeof window === 'undefined';

export const DEFAULT_CONFIG = config({
    tick: 20,
    mbps: 0.05,
    per: 50,
    fps: 100,
    perFrame: 1000 / 100,
    version: '26v24',
    gameVersion: 10,
});

export const GlobalConfig = status({
    tick: DEFAULT_CONFIG.tick,
    mbps: DEFAULT_CONFIG.mbps,
    per: DEFAULT_CONFIG.per,

    lastFps: DEFAULT_CONFIG.fps.valueOf(),
    fps: DEFAULT_CONFIG.fps.valueOf(),
    perFrame: DEFAULT_CONFIG.perFrame.valueOf(),

    enableCameraOffset: !isDev,

    autoShoot: false,
    devVersion: DEFAULT_CONFIG.version,
    port: 25566,
    serverAddr: '127.0.0.1:25566',

    cameraFollow: true,
    renderHitBox: false,
    crosshairRecoil: true,
});
