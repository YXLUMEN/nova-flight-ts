import type {Payload, PayloadId} from "./Payload.ts";
import type {PacketCodec} from "./codec/PacketCodec.ts";
import {type PayloadType} from "./PayloadTypeRegistry.ts";
import {Attached} from "./packet/relay/Attached.ts";
import {Detached} from "./packet/relay/Detached.ts";
import {config, deepFreeze} from "../utils/uit.ts";
import {ClientAttached} from "./packet/relay/ClientAttached.ts";
import {RelayMessage} from "./packet/relay/RelayMessage.ts";

export class RelayPackets {
    private static readonly PACKETS: PayloadType<any>[] = [];

    public static getType(index: number): PayloadType<any> | null {
        return this.PACKETS[index] ?? null;
    }

    public static registerNetworkPacket(): void {
        this.register(Detached.TYPE_ID, Detached.ID, Detached.CODEC);
        this.register(Attached.TYPE_ID, Attached.ID, Attached.CODEC);
        this.register(ClientAttached.TYPE_ID, ClientAttached.ID, ClientAttached.CODEC);
        this.register(RelayMessage.TYPE_ID, RelayMessage.ID, RelayMessage.CODEC);
        this.settle();
    }

    private static register<T extends Payload>(typeId: number, payloadId: PayloadId<T>, codec: PacketCodec<T>): void {
        if (typeId < 0) {
            throw new Error(`Invalid TYPE_ID ${typeId}: Must be >= 1`);
        }

        const id = payloadId.id;
        if (this.getType(typeId) !== null) {
            throw new ReferenceError(`Packet type ${id} is already registered!`);
        }

        const index = this.PACKETS.length;
        this.PACKETS[typeId] = config({id, index, codec});
    }

    private static settle() {
        for (let i = 0; i < this.PACKETS.length; i++) {
            if (this.getType(i) !== null) continue;
            throw new Error(
                `Missing implementation for TYPE_ID 0x${i.toString(16)} at index ${i}. Protocol IDs must be continuous.`
            );
        }

        deepFreeze(this);
    }
}