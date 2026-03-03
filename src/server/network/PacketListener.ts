import type {Payload} from "../../network/Payload.ts";
import type {ConnectionStateType} from "./ConnectionState.ts";

export interface PacketListener {
    onDisconnected(): void;

    accepts(packet: Payload): void;

    getPhase(): ConnectionStateType;

    tick?(): void;
}