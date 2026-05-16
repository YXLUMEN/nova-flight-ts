import type {Payload} from "./Payload.ts";
import {config, deepFreeze} from "../utils/uit.ts";
import type {PacketCodec} from "./codec/PacketCodec.ts";
import type {PayloadType} from "./PayloadType.ts";
import {NetworkSide} from "./NetworkSide.ts";

export interface CodecEntry<T extends Payload> {
    readonly type: PayloadType<T>;
    readonly index: number;
    readonly codec: PacketCodec<T>;
}

export class CodecRegistry {
    public static readonly RELAY = new CodecRegistry(NetworkSide.RELAY);
    public static readonly PLAY_S2C = new CodecRegistry(NetworkSide.SERVER);
    public static readonly PLAY_C2S = new CodecRegistry(NetworkSide.CLIENT);

    private static readonly PACKET_TYPES: CodecEntry<any>[] = [];

    private readonly codecs = new Map<PayloadType<any>, CodecEntry<any>>();
    private readonly side: NetworkSide;

    public static getGlobal(type: PayloadType<any>): CodecEntry<any> | null {
        return this.PLAY_S2C.get(type) ?? this.PLAY_C2S.get(type);
    }

    public static getGlobalByIndex(index: number): CodecEntry<any> | null {
        return this.PACKET_TYPES[index] ?? null;
    }

    public static settle(): void {
        deepFreeze(this);
    }

    private constructor(side: NetworkSide) {
        this.side = side;
    }

    public register<T extends Payload>(type: PayloadType<T>, codec: PacketCodec<T>): CodecEntry<T> {
        if (Object.isFrozen(this)) throw new Error('Register is settled, cannot insert new type now');

        if (this.codecs.has(type)) {
            throw new ReferenceError(`Packet type ${type.id} is already registered!`);
        }

        const index = CodecRegistry.PACKET_TYPES.length;
        const payload: CodecEntry<T> = config({type, index, codec});
        CodecRegistry.PACKET_TYPES.push(payload);
        this.codecs.set(type, payload);
        return payload;
    }

    public get(type: PayloadType<any>): CodecEntry<any> | null {
        return this.codecs.get(type) ?? null;
    }

    public getSide(): NetworkSide {
        return this.side;
    }
}