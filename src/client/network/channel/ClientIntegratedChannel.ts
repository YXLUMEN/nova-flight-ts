import type {Payload} from "../../../network/Payload.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {ClientChannel} from "./ClientChannel.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";

export class ClientIntegratedChannel extends ClientChannel {
    public recv(payload: Payload) {
        this.handler.recv(payload);
    }

    public override send(payload: Payload): void {
        const size = payload.estimateSize?.() ?? 6;
        const writer = new BinaryWriter(size + 2);
        this.out.codec.encode(writer, payload);
        const buffer = writer.toUint8Array();
        this.bus.sendFrame(buffer);
    }

    public override feed(reader: BinaryReader): void {
        this.decode(reader);
    }
}