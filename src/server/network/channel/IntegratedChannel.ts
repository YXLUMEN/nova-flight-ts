import type {Payload} from "../../../network/Payload.ts";
import {SessionChannel} from "./SessionChannel.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";

export class IntegratedChannel extends SessionChannel {
    public override unicast(payload: Payload) {
        const size = payload.estimateSize?.() ?? 62;
        const writer = new BinaryWriter(size + 2);
        this.out.encode(writer, payload);
        this.bus.unicast(this.sid, writer.toUint8Array());
    }
}