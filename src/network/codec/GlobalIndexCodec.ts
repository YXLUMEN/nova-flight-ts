import type {Return} from "../../type/types.ts";
import type {PacketCodec} from "./PacketCodec.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {Comparable} from "../../type/Comparable.ts";
import type {HashMap} from "../../utils/collection/HashMap.ts";
import {DecoderError, EncoderError, PacketIndexRange} from "../../type/errors.ts";
import {WrapperMap} from "../../utils/collection/WrapperMap.ts";
import {hashObject} from "../../utils/hash.ts";
import {makeLightError} from "../../utils/util.ts";

export class GlobalIndexCodec<V, T> implements PacketCodec<V>, Comparable {
    private static readonly RANGE = makeLightError(PacketIndexRange);

    private readonly getter: Return<V, T>;
    private readonly global: Entry<V, T>[];
    private readonly toId: Map<T, number>;
    private readonly start: number;
    private readonly end: number;

    public constructor(getter: Return<V, T>, global: Entry<V, T>[], toId: Map<T, number>, start: number) {
        this.getter = getter;
        this.global = global;
        this.toId = toId;
        // [start, end)
        this.start = start;
        this.end = global.length - 1;
    }

    public decode(reader: BinaryReader): V {
        const id = reader.readVarUint();
        if (id < this.start || id > this.end) throw GlobalIndexCodec.RANGE;

        const entry = this.global[id];
        if (entry === undefined) throw new DecoderError(`Received unknown packet id "${id}"`);
        return entry.codec.decode(reader);
    }

    public encode(writer: BinaryWriter, value: V) {
        const type = this.getter(value);
        const id = this.toId.get(type);
        if (id === undefined) throw new EncoderError(`Sending unknown packet\n "${JSON.stringify(type)}"`, {cause: type});

        writer.writeVarUint(id);
        const entry = this.global[id];
        entry.codec.encode(writer, value);
    }

    public hashCode(): number {
        let h = this.start | 0;
        h = (31 * h + this.end) | 0;
        for (let i = this.start; i <= this.end; i++) {
            h = 31 * h + hashObject(this.global[i].type);
            h |= 0;
        }
        return h;
    }

    public equals(other: unknown): boolean {
        if (other === this) return true;
        if (!(other instanceof GlobalIndexCodec)) return false;

        if (this.start !== other.start || this.end !== other.end) return false;

        const o = other.global;
        const s = this.global;
        if (o.length !== s.length) return false;

        for (let i = this.start; i <= this.end; i++) {
            if (s[i] !== o[i]) return false;
        }
        return true;
    }

    public static builder<V, T extends Comparable>(getter: Return<V, T>) {
        return new GlobalDispatcherBuilder(getter);
    }
}

class GlobalDispatcherBuilder<V, T extends Comparable> {
    private readonly getter: Return<V, T>;
    private readonly entries: Entry<V, T>[] = [];

    public constructor(getter: Return<V, T>) {
        this.getter = getter;
    }

    public add(type: T, codec: PacketCodec<V>) {
        this.entries.push({type, codec});
        return this;
    }

    public addEntry(entry: Entry<V, T>) {
        this.entries.push(entry);
        return this;
    }

    public build(global: Entry<V, T>[]) {
        const start = global.length;
        const map: HashMap<T, number> = new WrapperMap();
        for (const entry of this.entries) {
            if (map.has(entry.type)) throw new Error('Duplicate registration for type', {cause: entry});
            const id = global.length;
            map.set(entry.type, id);
            global.push(entry);
        }

        return new GlobalIndexCodec(this.getter, global, new Map(map.entries()), start);
    }
}

interface Entry<V, T> {
    readonly type: T;
    readonly codec: PacketCodec<V>;
}

export {type GlobalDispatcherBuilder};