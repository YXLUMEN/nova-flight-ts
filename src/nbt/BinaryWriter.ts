import type {UUID} from "../apis/registry.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";

export class BinaryWriter {
    private chunks: number[] = [];

    public pushBytes(buf: ArrayBuffer | Uint8Array) {
        const bytes = new Uint8Array(buf);
        this.chunks.push(...bytes);
    }

    public writeInt8(v: number): void {
        this.chunks.push(v & 0xff);
    }

    public writeUint8(v: number): void {
        this.chunks.push(v & 0xff);
    }

    public writeInt16(v: number): void {
        const buf = new ArrayBuffer(2);
        new DataView(buf).setInt16(0, v, true);
        this.pushBytes(buf);
    }

    public writeInt32(v: number): void {
        const buf = new ArrayBuffer(4);
        new DataView(buf).setInt32(0, v, true);
        this.pushBytes(buf);
    }

    public writeFloat(v: number): void {
        const buf = new ArrayBuffer(4);
        new DataView(buf).setFloat32(0, v, true);
        this.pushBytes(buf);
    }

    public writeDouble(v: number): void {
        const buf = new ArrayBuffer(8);
        new DataView(buf).setFloat64(0, v, true);
        this.pushBytes(buf);
    }

    public writeUint32(v: number): void {
        const buf = new ArrayBuffer(4);
        new DataView(buf).setUint32(0, v, true);
        this.pushBytes(buf);
    }

    public writeVarInt(v: number): void {
        let i = v >>> 0;
        while ((i & ~0x7F) !== 0) {
            this.chunks.push((i & 0x7F) | 0x80);
            i >>>= 7;
        }
        this.chunks.push(i);
    }

    public writeString(s: string): void {
        const utf8 = new TextEncoder().encode(s);
        this.writeInt16(utf8.length);
        this.pushBytes(utf8);
    }

    public writeUUID(uuid: UUID): void {
        this.pushBytes(UUIDUtil.parse(uuid));
    }

    public toUint8Array(): Uint8Array {
        return new Uint8Array(this.chunks);
    }
}