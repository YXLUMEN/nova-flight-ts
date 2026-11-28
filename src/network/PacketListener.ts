import type {Payload} from "./Payload.ts";
import type {ConnectionState} from "./ConnectionState.ts";
import type {NetworkSide} from "./NetworkSide.ts";

export interface PacketListener {
    onDisconnected(): void;

    accept(payload: Payload): void;

    getPhase(): ConnectionState;

    tick(): void;

    clear(): void;

    side(): NetworkSide;
}