export class NbtBinaryReader {
    private view: DataView;
    private offset = 0;

    public constructor(bytes: Uint8Array) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    public bytesRemaining(): number {
        return this.view.byteLength - this.offset;
    }

    public readInt8(): number {
        const v = this.view.getInt8(this.offset);
        this.offset += 1;
        return v;
    }

    public readInt16(): number {
        const v = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return v;
    }

    public readInt32(): number {
        const v = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return v;
    }

    public readFloat(): number {
        const v = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return v;
    }

    public readDouble(): number {
        const v = this.view.getFloat64(this.offset, true);
        this.offset += 8;
        return v;
    }

    public readUint32(): number {
        const v = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return v;
    }

    public readString(): string {
        const len = this.readInt16();
        console.assert(len >= 0 && this.offset + len <= this.view.byteLength, "Invalid string length");

        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        const str = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
        this.offset += len;
        return str;
    }

    public readSlice(len: number): Uint8Array {
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        this.offset += len;
        return bytes;
    }

    public getBuffer() {
        return new Uint8Array(this.view.buffer);
    }
}
