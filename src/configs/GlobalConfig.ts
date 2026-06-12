import {config, status} from "../utils/uit.ts";

// @ts-expect-error
export const isDev = import.meta.env.MODE === 'development';

// @ts-expect-error
export const isServer = isDev ? typeof window === 'undefined' : __IS_SERVER__;

export const DEFAULT_CONFIG = config({
    per: 50,
    fps: 100,
    perFrame: 1000 / 100,
    version: '26v28',
    gameVersion: 11,
});

export const GlobalConfig = status({
    per: DEFAULT_CONFIG.per,

    lastFps: DEFAULT_CONFIG.fps.valueOf(),
    fps: DEFAULT_CONFIG.fps.valueOf(),
    perFrame: DEFAULT_CONFIG.perFrame.valueOf(),

    enableCameraOffset: !isDev,

    autoShoot: false,
    devVersion: DEFAULT_CONFIG.version,
    port: 25566,
    serverAddr: '127.0.0.1:25566',
    generalMode: false,

    cameraFollow: true,
    renderHitBox: false,
    crosshairRecoil: true,
});
