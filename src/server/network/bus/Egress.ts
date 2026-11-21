import type {Payload} from "../../../network/Payload.ts";
import type {ProtocolInfo} from "../../../network/protocol/ProtocolInfo.ts";

export interface Egress {
    enqueue(payload: Payload): void;

    broadWith(payload: Payload, protocol: ProtocolInfo): void;

    broadcast(payload: Payload): void;

    unicast(sid: number, frame: Uint8Array<ArrayBuffer>): void;

    action(buf: Uint8Array<ArrayBuffer>): void;
}