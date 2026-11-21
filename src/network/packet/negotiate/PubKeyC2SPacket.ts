import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import type {ServerNegotiateHandler} from "../../../server/network/handler/ServerNegotiateHandler.ts";

export class PubKeyC2SPacket implements Payload {
    public static readonly ID: PayloadType<PubKeyC2SPacket> = payloadType('client_pubkey');
    public static readonly CODEC: PacketCodec<PubKeyC2SPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.pubKey.length);
            writer.pushBytes(value.pubKey);
        },
        reader => {
            const key = reader.readSlice(reader.readVarUint());
            return new PubKeyC2SPacket(key);
        }
    );

    public readonly pubKey: Uint8Array<ArrayBuffer>;

    public constructor(key: Uint8Array<ArrayBuffer>) {
        this.pubKey = key;
    }

    public type(): PayloadType<PubKeyC2SPacket> {
        return PubKeyC2SPacket.ID;
    }

    public accept(listener: ServerNegotiateHandler): void {
        void listener.onClientPubKey(this);
    }

    public estimateSize(): number {
        return 2 + this.pubKey.length;
    }

    public protocol(): ConnectionState {
        return ConnectionState.NEGOTIATION;
    }
}