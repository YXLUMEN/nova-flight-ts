import type {UUID} from "../apis/registry.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";

export class BinaryWriter {
    private buffer: Uint8Array;
    private view: DataView;
    private offset: number = 0;

    public constructor(initialSize = 128) {
        this.buffer = new Uint8Array(initialSize);
        this.view = new DataView(this.buffer.buffer);
    }

    private ensure(extra: number) {
        const required = this.offset + extra;
        if (required > this.buffer.length) {
            let newLen = this.buffer.length;

            while (newLen < required) newLen *= 2;
            const newBuf = new Uint8Array(newLen);
            newBuf.set(this.buffer, 0);

            this.buffer = newBuf;
            this.view = new DataView(this.buffer.buffer);
        }
    }

    public pushBytes(buf: ArrayBuffer | Uint8Array) {
        const bytes = new Uint8Array(buf);
        this.ensure(bytes.length);
        this.buffer.set(bytes, this.offset);
        this.offset += bytes.length;
    }

    public writeByte(v: number) {
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

    public writeVarUInt(v: number) {
        let i = v >>> 0;
        while ((i & ~0x7F) !== 0) {
            this.writeByte((i & 0x7F) | 0x80);
            i >>>= 7;
        }
        this.writeByte(i);
    }

    public writeString(s: string) {
        const utf8 = new TextEncoder().encode(s);
        this.writeInt16(utf8.length);
        this.ensure(utf8.length);
        this.buffer.set(utf8, this.offset);
        this.offset += utf8.length;
    }

    public writeUUID(uuid: UUID): void {
        this.pushBytes(UUIDUtil.parse(uuid));
    }

    public toUint8Array(): Uint8Array {
        return this.buffer.subarray(0, this.offset);
    }

    public reset() {
        this.offset = 0;
    }
}