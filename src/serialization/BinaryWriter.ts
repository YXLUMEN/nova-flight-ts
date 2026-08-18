import type {UUID} from "../type/types.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";
import {PacketTooLargeError} from "../type/errors.ts";

export class BinaryWriter {
    public static readonly MAX_BUFFER_SIZE = 16 * 1024 * 1024;

    private readonly maxSize: number;
    private buffer: Uint8Array<ArrayBuffer>;
    private view: DataView<ArrayBuffer>;
    private offset: number = 0;

    public constructor(size = 128, max = BinaryWriter.MAX_BUFFER_SIZE) {
        BinaryWriter.checkMaxSize(max);
        this.maxSize = max;
        this.buffer = new Uint8Array(size);
        this.view = new DataView(this.buffer.buffer);
    }

    public static alloc(size = 128): BinaryWriter {
        return new BinaryWriter(size);
    }

    public static from(data: Uint8Array<ArrayBuffer>, maxSize?: number): BinaryWriter;
    public static from(data: ArrayBuffer, byteOffset?: number, length?: number, maxSize?: number): BinaryWriter;
    public static from(data: Iterable<number>, maxSize?: number): BinaryWriter;
    public static from(data: string, maxSize?: number): BinaryWriter;
    public static from(
        data: string | ArrayBuffer | Uint8Array<ArrayBuffer> | Iterable<number>,
        byteOffset?: number,
        length?: number,
        maxSize?: number,
    ): BinaryWriter {
        const limit = maxSize ?? this.MAX_BUFFER_SIZE;
        if (typeof data === 'string') {
            return this.createWithData(new TextEncoder().encode(data), limit);
        }
        if (data instanceof ArrayBuffer) {
            const start = byteOffset ?? 0;
            const len = length ?? data.byteLength - start;
            if (start < 0 || len < 0 || start + len > data.byteLength) {
                throw new RangeError(
                    `Invalid range [${start}, ${start + len}) for ArrayBuffer of byteLength ${data.byteLength}`
                );
            }
            return this.createWithData(new Uint8Array(data, start, len), limit);
        }
        // Uint8Array 及其他 TypedArray / ArrayLike / Iterable 逐元素复制
        return this.createWithData(new Uint8Array(data), limit);
    }

    private static create(
        buffer: Uint8Array<ArrayBuffer>,
        offset: number = 0,
        max: number = BinaryWriter.MAX_BUFFER_SIZE
    ): BinaryWriter {
        const writer = Object.create(BinaryWriter.prototype) as BinaryWriter;
        // @ts-ignore
        writer.maxSize = max;
        writer.buffer = buffer;
        writer.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        writer.offset = offset;
        return writer;
    }

    private static createWithData(
        buffer: Uint8Array<ArrayBuffer>,
        max: number = BinaryWriter.MAX_BUFFER_SIZE
    ): BinaryWriter {
        return this.create(buffer, buffer.length, max);
    }

    private static checkMaxSize(maxSize: number): void {
        if (maxSize !== Infinity && (!Number.isInteger(maxSize) || maxSize < 0)) {
            throw new RangeError(`Invalid max buffer size ${maxSize}: expected a non-negative integer or Infinity`);
        }
    }

    private ensure(extra: number) {
        const required = this.offset + extra;

        if (required > this.maxSize) {
            throw new PacketTooLargeError(required, this.maxSize);
        }

        if (required > this.buffer.length) {
            let newLen = this.buffer.length || 1;
            while (newLen < required) newLen *= 2;
            if (newLen > this.maxSize) newLen = this.maxSize;

            const newBuf = new Uint8Array(newLen);
            newBuf.set(this.buffer, 0);

            this.buffer = newBuf;
            this.view = new DataView(this.buffer.buffer);
        }
    }

    public pushBytes(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): void {
        const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        this.ensure(bytes.length);
        this.buffer.set(bytes, this.offset);
        this.offset += bytes.length;
    }

    public writeInt8(v: number) {
        this.ensure(1);
        this.buffer[this.offset++] = v & 0xFF;
    }

    public writeInt16(v: number) {
        this.ensure(2);
        this.view.setInt16(this.offset, v, true);
        this.offset += 2;
    }

    public writeInt32(v: number) {
        this.ensure(4);
        this.view.setInt32(this.offset, v, true);
        this.offset += 4;
    }

    public writeFloat(v: number) {
        this.ensure(4);
        this.view.setFloat32(this.offset, v, true);
        this.offset += 4;
    }

    public writeDouble(v: number) {
        this.ensure(8);
        this.view.setFloat64(this.offset, v, true);
        this.offset += 8;
    }

    public writeUint16(v: number) {
        this.ensure(2);
        this.view.setUint16(this.offset, v, true);
        this.offset += 2;
    }

    public writeUint32(v: number) {
        this.ensure(4);
        this.view.setUint32(this.offset, v, true);
        this.offset += 4;
    }

    public writeVarUint(v: number) {
        let i = v >>> 0;
        while ((i & ~0x7F) !== 0) {
            this.writeInt8((i & 0x7F) | 0x80);
            i >>>= 7;
        }
        this.writeInt8(i);
    }

    public writeBoolean(v: boolean) {
        this.writeInt8(v ? 1 : 0);
    }

    /**
     * Use Uint16 express total length
     * */
    public writeString(s: string) {
        const utf8 = new TextEncoder().encode(s);
        this.writeUint16(utf8.length);
        this.ensure(utf8.length);
        this.buffer.set(utf8, this.offset);
        this.offset += utf8.length;
    }

    public writeUUID(uuid: UUID): void {
        this.pushBytes(UUIDUtil.parse(uuid));
    }

    public toUint8Array(): Uint8Array<ArrayBuffer> {
        return this.buffer.subarray(0, this.offset);
    }

    public getOffset(): number {
        return this.offset;
    }

    public truncate(offset: number): void {
        if (offset < 0 || offset > this.offset) {
            throw new RangeError(`Invalid offset ${offset}. Must be between 0 and current offset ${this.offset}.`);
        }
        this.offset = offset;
    }

    public reset(shrinkTo: number = -1) {
        this.offset = 0;
        if (shrinkTo > 0 && this.buffer.length > shrinkTo) {
            this.buffer = new Uint8Array(shrinkTo);
            this.view = new DataView(this.buffer.buffer);
        }
    }
}