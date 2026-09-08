import {config, status} from "../utils/uit.ts";

// @ts-expect-error Inject by vite
export const isDev = import.meta.env.MODE === 'development';
export const isServer = isDev ? typeof window === 'undefined' : __IS_SERVER__;
export const isClient = !isServer;

export const DEFAULT_CONFIG = config({
    per: 50,
    version: '26v28',
    gameVersion: 11,
});

export const RuntimeConfig = status({
    per: DEFAULT_CONFIG.per,
    perFrame: 1000 / 100,

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
