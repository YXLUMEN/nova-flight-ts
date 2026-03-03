import {config} from "../../utils/uit.ts";

export const ConfigState = config({
    HANDSHAKE: 0,
    VERIFYING: 1,
    READY: 2,
});

export type ConfigStateType = typeof ConfigState[keyof typeof ConfigState];