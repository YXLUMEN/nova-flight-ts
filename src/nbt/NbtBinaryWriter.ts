export class NbtBinaryWriter {
    private chunks: number[] = [];

    public pushBytes(buf: ArrayBuffer | Uint8Array) {
        const bytes = new Uint8Array(buf);
        this.chunks.push(...bytes);
    }

    public writeInt8(v: number): void {
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

    public writeString(s: string): void {
        const utf8 = new TextEncoder().encode(s);
        this.writeInt16(utf8.length);
        for (let i = 0; i < utf8.length; i++) this.chunks.push(utf8[i]);
    }

    public toUint8Array(): Uint8Array {
        return new Uint8Array(this.chunks);
    }
}