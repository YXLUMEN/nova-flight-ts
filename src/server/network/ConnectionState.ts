import {config} from "../../utils/uit.ts";

export const ConnectionState = config({
    CONNECTING: 0,
    TRANSITIONING: 1,
    CONFIGURATION: 2,
    STABLE: 3,
    DISCONNECTING: 4,
    CLOSE: 5
});

export type ConnectionStateType = typeof ConnectionState[keyof typeof ConnectionState];