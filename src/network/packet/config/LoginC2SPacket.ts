import type {Payload} from "../../Payload.ts";
import type {ServerConfigHandler} from "../../../server/network/handler/ServerConfigHandler.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class LoginC2SPacket implements Payload {
    public static readonly ID: PayloadType<LoginC2SPacket> = payloadType('login');
    public static readonly CODEC: PacketCodec<LoginC2SPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeInt8(value.key.length);
            writer.pushBytes(value.key);
        },
        reader => {
            const len = reader.readUint8();
            return new LoginC2SPacket(reader.readSlice(len));
        }
    );

    public readonly key: Uint8Array<ArrayBuffer>;

    public constructor(key: Uint8Array<ArrayBuffer>) {
        this.key = key;
    }

    public type(): PayloadType<LoginC2SPacket> {
        return LoginC2SPacket.ID;
    }

    public accept(listener: ServerConfigHandler): void {
        void listener.onClientLogin(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public protocol(): ConnectionState {
        return ConnectionState.CONFIGURATION;
    }
}