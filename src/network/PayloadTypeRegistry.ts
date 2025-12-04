import type {Identifier} from "../registry/Identifier.ts";
import type {Payload, PayloadId} from "./Payload.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import {createClean, deepFreeze} from "../utils/uit.ts";
import type {PacketCodec} from "./codec/PacketCodec.ts";

type Side = 'server' | 'client';

export interface PayloadType<T extends Payload> {
    readonly id: Identifier;
    readonly index: number;
    readonly codec: PacketCodec<T>;
}

export class PayloadTypeRegistry {
    private static readonly PLAY_S2C = new PayloadTypeRegistry('server');
    private static readonly PLAY_C2S = new PayloadTypeRegistry('client');
    private static readonly PACKET_TYPES: PayloadType<any>[] = [];

    private readonly packetTypes = new HashMap<Identifier, PayloadType<any>>();
    private readonly side: Side;

    public constructor(side: Side) {
        this.side = side;
    }

    public static getGlobal(id: Identifier): PayloadType<any> | null {
        return this.PLAY_C2S.get(id) ?? this.PLAY_S2C.get(id);
    }

    public static getGlobalByIndex(index: number): PayloadType<any> | null {
        return PayloadTypeRegistry.PACKET_TYPES[index] ?? null;
    }

    public static playS2C() {
        return this.PLAY_S2C;
    }

    public static playC2S() {
        return this.PLAY_C2S;
    }

    public register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): PayloadType<T> {
        if (Object.isFrozen(this)) throw new Error('Register is settled, cannot insert new type now');

        const id = payloadId.id;
        if (this.packetTypes.has(id)) {
            throw new ReferenceError(`Packet type ${id} is already registered!`);
        }

        const index = PayloadTypeRegistry.PACKET_TYPES.length;
        const payload: PayloadType<T> = createClean({id, index, codec});
        PayloadTypeRegistry.PACKET_TYPES.push(payload);
        this.packetTypes.set(id, payload);
        return payload;
    }

    public get(id: Identifier): PayloadType<any> | null {
        return this.packetTypes.get(id) ?? null;
    }

    public settle() {
        deepFreeze(this);
    }

    public getSide(): Side {
        return this.side;
    }
}