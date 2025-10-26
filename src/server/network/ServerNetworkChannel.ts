import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {Payload} from "../../network/Payload.ts";
import type {UUID} from "../../apis/types.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {IServerPlayNetwork} from "./IServerPlayNetwork.ts";

export class ServerNetworkChannel extends NetworkChannel implements IServerPlayNetwork {
    public constructor(url: string) {
        super(url, PayloadTypeRegistry.playS2C());
    }

    public sendTo<T extends Payload>(payload: T, target: UUID) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeByte(0x12);
        writer.writeUUID(target);

        writer.writeString(type.id.toString());
        type.codec.encode(writer, payload);

        this.ws!.send(writer.toUint8Array());
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: UUID[]) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeByte(0x13);

        writer.writeVarUInt(excludes.length);
        for (const id of excludes) {
            writer.writeUUID(id);
        }

        writer.writeString(type.id.toString());
        type.codec.encode(writer, payload);

        this.ws!.send(writer.toUint8Array());
    }

    protected override getSide() {
        return 'server';
    }

    protected override getHeader() {
        return 0x11;
    }

    protected register() {
        this.ws!.send(new Uint8Array([0x01]));
        console.log("Server registered");
    }
}