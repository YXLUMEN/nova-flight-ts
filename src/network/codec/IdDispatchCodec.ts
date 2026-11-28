import type {PacketCodec} from "./PacketCodec.ts";
import type {Return} from "../../type/types.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {Comparable} from "../../type/Comparable.ts";
import type {HashMap} from "../../utils/collection/HashMap.ts";
import {hashObject} from "../../utils/hash.ts";
import {DecoderError, EncoderError} from "../../type/errors.ts";
import {WrapperMap} from "../../utils/collection/WrapperMap.ts";
import {makeTraceLimitError} from "../../utils/util.ts";

export class IdDispatchCodec<V, T> implements PacketCodec<V>, Comparable {
    private readonly getter: Return<V, T>;
    private readonly byId: Entry<V, T>[];
    private readonly toId: Map<T, number>;

    public constructor(getter: Return<V, T>, byId: Entry<V, T>[], toId: Map<T, number>) {
        if (byId.length !== toId.size) throw new Error('Unmatch entry count');
        this.getter = getter;
        this.byId = byId;
        this.toId = toId;
    }

    public decode(reader: BinaryReader): V {
        const id = reader.readVarUint();
        const entry = this.byId[id];
        if (entry === undefined) {
            throw makeTraceLimitError(DecoderError, 3, `Received unknown packet id "${id}"`);
        }

        return entry.codec.decode(reader);
    }

    public encode(writer: BinaryWriter, value: V) {
        const type = this.getter(value);
        const id = this.toId.get(type);
        if (id === undefined) {
            throw makeTraceLimitError(EncoderError, 3, `Sending unknown packet:\n "${type}"`, {cause: type});
        }

        writer.writeVarUint(id);
        const entry = this.byId[id];
        entry.codec.encode(writer, value);
    }

    public hashCode(): number {
        let h = 0;
        for (const entry of this.byId) {
            h = (31 * h + hashObject(entry.type)) | 0;
        }
        return h;
    }

    public equals(other: unknown): boolean {
        if (other === this) return true;
        if (!(other instanceof IdDispatchCodec)) return false;

        const o = other.byId;
        const s = this.byId;
        if (o.length !== s.length) return false;

        for (let i = 0; i < s.length; i++) {
            if (s[i] !== o[i]) return false;
        }
        return true;
    }

    public static builder<V, T extends Comparable>(getter: Return<V, T>) {
        return new DispatcherBuilder(getter);
    }
}

class DispatcherBuilder<V, T extends Comparable> {
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

    public build() {
        const map: HashMap<T, number> = new WrapperMap();
        for (const entry of this.entries) {
            if (map.has(entry.type)) throw new Error('Duplicate registration for type', {cause: entry});
            const id = map.size;
            map.set(entry.type, id);
        }

        return new IdDispatchCodec(this.getter, Array.from(this.entries), new Map(map.entries()));
    }
}

interface Entry<V, T> {
    readonly type: T;
    readonly codec: PacketCodec<V>;
}

export {type DispatcherBuilder};