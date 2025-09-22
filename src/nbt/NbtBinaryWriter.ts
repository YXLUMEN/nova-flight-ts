export class NbtBinaryWriter {
    private chunks: number[] = [];

    public writeByte(v: number): void {
        this.chunks.push(v & 0xff);
    }

    public writeInt16(v: number): void {
        this.chunks.push(v & 0xff, (v >> 8) & 0xff);
    }

    public writeInt32(v: number): void {
        this.chunks.push(
            v & 0xff,
            (v >> 8) & 0xff,
            (v >> 16) & 0xff,
            (v >> 24) & 0xff
        );
    }

    public writeDouble(v: number): void {
        const buf = new ArrayBuffer(8);
        new DataView(buf).setFloat64(0, v, true);
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < 8; i++) this.chunks.push(bytes[i]);
    }

    public writeString(s: string): void {
        const utf8 = new TextEncoder().encode(s);
        this.writeInt16(utf8.length);
        for (let i = 0; i < utf8.length; i++) {
            this.chunks.push(utf8[i]);
        }
    }

    public toUint8Array(): Uint8Array {
        return new Uint8Array(this.chunks);
    }
}