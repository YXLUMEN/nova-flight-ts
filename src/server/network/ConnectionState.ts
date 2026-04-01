import {config} from "../../utils/uit.ts";

export const ConnectionState = config({
    HANDSHAKING: 0,
    NEGOTIATION: 1,
    CONFIGURATION: 2,
    PLAY: 3,
    DISCONNECTING: 4,
    CLOSED: 5
});

export type ConnectionStateType = typeof ConnectionState[keyof typeof ConnectionState];