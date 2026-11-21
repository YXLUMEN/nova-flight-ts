import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ClientNegotiateHandler} from "../../../client/network/handler/ClientNegotiateHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class PubKeyS2CPacket implements Payload {
    public static readonly SALT_LEN = 16;

    public static readonly ID: PayloadType<PubKeyS2CPacket> = payloadType('server_pubkey');
    public static readonly CODEC: PacketCodec<PubKeyS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.pubKey.length);
            writer.pushBytes(value.pubKey);
            writer.pushBytes(value.salt);
        },
        reader => {
            const key = reader.readSlice(reader.readVarUint());
            const salt = reader.readSlice(PubKeyS2CPacket.SALT_LEN);
            return new PubKeyS2CPacket(key, salt);
        }
    );

    public readonly pubKey: Uint8Array<ArrayBuffer>;
    public readonly salt: Uint8Array<ArrayBuffer>;

    public constructor(key: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>) {
        this.pubKey = key;
        this.salt = salt;
    }

    public type(): PayloadType<PubKeyS2CPacket> {
        return PubKeyS2CPacket.ID;
    }

    public accept(listener: ClientNegotiateHandler): void {
        void listener.onServerPubKey(this);
    }

    public estimateSize(): number {
        return 1 + this.pubKey.length + PubKeyS2CPacket.SALT_LEN;
    }

    public protocol(): ConnectionState {
        return ConnectionState.NEGOTIATION;
    }
}