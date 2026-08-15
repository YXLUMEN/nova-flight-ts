import type {Payload} from "./Payload.ts";
import {deepFreeze} from "../utils/uit.ts";
import type {PacketCodec} from "./codec/PacketCodec.ts";
import type {PayloadType} from "./PayloadType.ts";
import {NetworkSide} from "./NetworkSide.ts";

class CodecEntry<T extends Payload> {
    public readonly type: PayloadType<T>;
    public readonly index: number;
    public readonly codec: PacketCodec<T>;

    public constructor(type: PayloadType<T>, index: number, codec: PacketCodec<T>) {
        this.type = type;
        this.index = index;
        this.codec = codec;
    }
}

export class CodecRegistry {
    public static readonly RELAY = new CodecRegistry(NetworkSide.RELAY);
    public static readonly S2C = new CodecRegistry(NetworkSide.SERVER);
    public static readonly C2S = new CodecRegistry(NetworkSide.CLIENT);
    public static VERSION: number;

    private static readonly PACKET_TYPES: CodecEntry<any>[] = [];

    private readonly codecs = new Map<PayloadType<any>, CodecEntry<any>>();
    private readonly side: NetworkSide;

    private constructor(side: NetworkSide) {
        this.side = side;
    }

    public register<T extends Payload>(type: PayloadType<T>, codec: PacketCodec<T>): CodecEntry<T> {
        if (Object.isFrozen(this)) throw new Error('Register is settled, cannot insert new type now');

        if (this.codecs.has(type)) {
            throw new ReferenceError(`Packet type ${type.id} is already registered!`);
        }

        const index = CodecRegistry.PACKET_TYPES.length;
        const payload: CodecEntry<T> = new CodecEntry<T>(type, index, codec);
        CodecRegistry.PACKET_TYPES.push(payload);
        this.codecs.set(type, payload);
        return payload;
    }

    public get(type: PayloadType<any>): CodecEntry<any> | undefined {
        return this.codecs.get(type);
    }

    public getSide(): NetworkSide {
        return this.side;
    }

    public static byId(index: number): CodecEntry<any> | undefined {
        return this.PACKET_TYPES[index];
    }

    public static settle(): void {
        let hash = 0;
        for (const entry of this.PACKET_TYPES) {
            hash = (31 * hash + entry.index) | 0;
            hash = (31 * hash + entry.type.id.hashCode()) | 0;
        }
        this.VERSION = hash;
        deepFreeze(this);
    }
}

export {type CodecEntry};