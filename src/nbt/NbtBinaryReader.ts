export class NbtBinaryReader {
    private view: DataView;
    private offset = 0;

    public constructor(bytes: Uint8Array) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    public bytesRemaining(): number {
        return this.view.byteLength - this.offset;
    }

    public readByte(): number {
        const v = this.view.getUint8(this.offset);
        this.offset += 1;
        return v;
    }

    public readInt16(): number {
        const v = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return v;
    }

    public readInt32(): number {
        const v = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return v;
    }

    public readDouble(): number {
        const v = this.view.getFloat64(this.offset, true);
        this.offset += 8;
        return v;
    }

    public readString(): string {
        const len = this.readInt16();
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        const str = new TextDecoder().decode(bytes);
        this.offset += len;
        return str;
    }

    public readSlice(len: number): Uint8Array {
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        this.offset += len;
        return bytes;
    }
}
