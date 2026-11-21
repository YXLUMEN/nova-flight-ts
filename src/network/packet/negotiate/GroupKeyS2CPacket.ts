import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ClientNegotiateHandler} from "../../../client/network/handler/ClientNegotiateHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class GroupKeyS2CPacket implements Payload {
    public static readonly ID: PayloadType<GroupKeyS2CPacket> = payloadType('group_key');
    public static readonly CODEC: PacketCodec<GroupKeyS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.wrappered.length);
            writer.pushBytes(value.wrappered);
            writer.writeVarUint(value.iv.length);
            writer.pushBytes(value.iv);
        },
        reader => {
            const key = reader.readSlice(reader.readVarUint());
            const salt = reader.readSlice(reader.readVarUint());
            return new GroupKeyS2CPacket(key, salt);
        }
    );

    public readonly wrappered: Uint8Array<ArrayBuffer>;
    public readonly iv: Uint8Array<ArrayBuffer>;

    public constructor(wrappered: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>) {
        this.wrappered = wrappered;
        this.iv = iv;
    }

    public type(): PayloadType<GroupKeyS2CPacket> {
        return GroupKeyS2CPacket.ID;
    }

    public accept(listener: ClientNegotiateHandler): void {
        void listener.onGroup(this);
    }

    public estimateSize(): number {
        return 3 + this.wrappered.length + this.iv.length;
    }

    public protocol(): ConnectionState {
        return ConnectionState.NEGOTIATION;
    }
}