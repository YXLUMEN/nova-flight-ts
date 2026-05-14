import type {Payload} from "../Payload.ts";
import type {ConnectionState} from "../../server/network/ConnectionState.ts";

export interface PacketListener {
    onDisconnected(): void;

    accept(packet: Payload): void;

    getPhase(): ConnectionState;

    tick?(): void;

    clear(): void;
}