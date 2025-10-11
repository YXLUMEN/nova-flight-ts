import type {Identifier} from "../registry/Identifier.ts";
import type {Payload, PayloadId} from "./Payload.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import {createCleanObj} from "../utils/uit.ts";
import type {PacketCodecUtil} from "./codec/PacketCodecUtil.ts";
import type {PacketCodec} from "./codec/PacketCodec.ts";

type Side = 'server' | 'client';

export interface PayloadType<T extends Payload> {
    readonly id: Identifier;
    readonly codec: PacketCodecUtil<T>;
}

export class PayloadTypeRegistry {
    public static readonly PLAY_S2C = new PayloadTypeRegistry('server');
    public static readonly PLAY_C2S = new PayloadTypeRegistry('client');

    private readonly packetTypes = new HashMap<Identifier, PayloadType<any>>();
    private readonly side: Side;

    public constructor(side: Side) {
        this.side = side;
    }

    public static getGlobal(id: Identifier): PayloadType<any> | null {
        return this.PLAY_C2S.get(id) ?? this.PLAY_S2C.get(id);
    }

    public static playS2C() {
        return this.PLAY_S2C;
    }

    public static playC2S() {
        return this.PLAY_C2S;
    }

    public register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): PayloadType<T> {
        const id = payloadId.id;
        if (this.packetTypes.has(id)) {
            throw new ReferenceError(`Packet type ${id} is already registered!`);
        }

        const payload = createCleanObj({id, codec}) as PayloadType<T>;
        this.packetTypes.set(id, payload);
        return payload;
    }

    public get(id: Identifier): PayloadType<any> | null {
        return this.packetTypes.get(id) ?? null;
    }

    public getSide(): Side {
        return this.side;
    }
}