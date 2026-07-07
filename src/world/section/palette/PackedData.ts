import {IllegalArgumentError} from "../../../type/errors.ts";
import type {Consumer} from "../../../type/types.ts";


export class PackedData {
    private readonly bitsPerAxis: number;
    private readonly sideLength: number;
    private readonly capacity: number;

    private readonly data: Uint8Array<ArrayBuffer>;

    private readonly bitWidth: number;
    private readonly maxValue: number;

    private readonly valuesPerByte: number;
    private readonly divShift: number;
    private readonly modMask: number;

    public constructor(bitsPerAxis: number, bitWidth: number, data?: Uint8Array<ArrayBuffer>) {
        if (!Number.isInteger(bitsPerAxis)) {
            throw new IllegalArgumentError(`BitPerAxis must be an integer, but got ${bitsPerAxis}`);
        }

        if (bitWidth < 1 || bitWidth > 8 || !Number.isInteger(bitWidth)) {
            throw new RangeError("Bit width must in 1/2/4/8");
        }

        const index = Math.log2(bitWidth) + 1;
        if (!Number.isSafeInteger(index)) {
            throw new RangeError("Bit width must in 1/2/4/8");
        }

        this.bitsPerAxis = bitsPerAxis;
        this.sideLength = 1 << bitsPerAxis;
        this.capacity = this.sideLength * this.sideLength;

        this.bitWidth = bitWidth;
        this.maxValue = (1 << bitWidth) - 1;

        this.valuesPerByte = Math.floor(8 / this.bitWidth);
        this.divShift = Math.log2(this.valuesPerByte);
        this.modMask = this.valuesPerByte - 1;

        const requiredLen = PackedData.computeDataSize(this.capacity, bitWidth);
        if (data) {
            if (data.length !== requiredLen) {
                throw new Error(`Invalid length given for storage, got: ${data.length} but expected: ${requiredLen}`);
            }
            this.data = data;
        } else {
            this.data = new Uint8Array(requiredLen);
        }
    }

    public static fromCapacity(capacity: number, bitWidth: number, data?: Uint8Array<ArrayBuffer>): PackedData {
        if (capacity < 1) {
            throw new RangeError("Capacity must be positive");
        }

        const sideLength = Math.sqrt(capacity);
        if (!Number.isSafeInteger(sideLength)) {
            throw new RangeError(`Capacity ${capacity} is not a perfect square`);
        }

        if ((sideLength & (sideLength - 1)) !== 0) {
            throw new RangeError(`Capacity ${capacity} is not a power of 2 squared (sideLength=${sideLength})`);
        }

        const bitsPerAxis = Math.log2(sideLength);
        if (!Number.isSafeInteger(bitsPerAxis)) {
            throw new RangeError(`Invalid capacity: ${capacity}`);
        }
        return new PackedData(bitsPerAxis, bitWidth, data);
    }

    public get(index: number): number {
        const byteIndex = index >> this.divShift;
        const bitIndex = (index & this.modMask) * this.bitWidth;
        return (this.data[byteIndex] >> bitIndex) & this.maxValue;
    }

    public set(index: number, value: number): void {
        const byteIndex = index >> this.divShift;
        const bitIndex = (index & this.modMask) * this.bitWidth;
        this.data[byteIndex] =
            (this.data[byteIndex] & ~(this.maxValue << bitIndex)) |
            ((value & this.maxValue) << bitIndex);
    }

    public getByPos(x: number, y: number): number {
        return this.get(this.getIndex(x, y));
    }

    public setByPos(x: number, y: number, value: number): void {
        if (value < 0 || value > this.maxValue) {
            throw new RangeError(`Value ${value} out of range [0, ${this.maxValue}]`);
        }

        this.set(this.getIndex(x, y), value);
    }

    public fill(value: number): void {
        if (value < 0 || value > this.maxValue) {
            throw new RangeError(`Value ${value} out of range [0, ${this.maxValue}]`);
        }
        let fillByte = 0;
        for (let i = 0; i < this.valuesPerByte; i++) {
            fillByte |= (value & this.maxValue) << (i * this.bitWidth);
        }
        this.data.fill(fillByte);
    }

    public foreach(consumer: Consumer<number>): void {
        let count = 0;
        for (const byte of this.data) {
            let cellValue = byte;
            for (let i = 0; i < this.valuesPerByte; i++) {
                consumer(cellValue & this.maxValue);
                cellValue >>= this.bitWidth;
                if (++count >= this.capacity) return;
            }
        }
    }

    public* [Symbol.iterator](): Iterator<number> {
        let count = 0;
        for (const byte of this.data) {
            let cellValue = byte;
            for (let i = 0; i < this.valuesPerByte; i++) {
                yield cellValue & this.maxValue;
                cellValue >>= this.bitWidth;
                if (++count >= this.capacity) return;
            }
        }
    }

    public upgrade(newBitWidth: number): PackedData {
        if (newBitWidth <= this.bitWidth) {
            throw new Error(`Cannot downgrade bit width from ${this.bitWidth} to ${newBitWidth}`);
        }

        const newData = new PackedData(this.bitsPerAxis, newBitWidth);
        for (let i = 0; i < this.capacity; i++) {
            newData.set(i, this.get(i));
        }

        return newData;
    }

    public copy() {
        return new PackedData(this.bitsPerAxis, this.bitWidth, this.data.slice());
    }

    public getIndex(x: number, y: number): number {
        if (x < 0 || x >= this.sideLength || y < 0 || y >= this.sideLength) {
            throw new RangeError(`Coordinates (${x}, ${y}) out of bounds [0, ${this.sideLength})`);
        }
        return (y << this.bitsPerAxis) | x;
    }

    public getCapacity(): number {
        return this.capacity;
    }

    public getBitWidth(): number {
        return this.bitWidth;
    }

    public getDataSize(): number {
        return this.data.length;
    }

    public getRawData(): Uint8Array<ArrayBuffer> {
        return this.data;
    }

    /**
     * 计算指定位宽所需的数据字节数
     * */
    public static computeDataSize(capacity: number, bitWidth: number): number {
        const totalBits = capacity * bitWidth;
        return (totalBits + 7) >> 3;
    }


    /**
     * 计算指定 palette 大小所需的最小位宽
     */
    public static computeBitWidth(paletteSize: number): number {
        if (paletteSize <= 2) return 1;
        if (paletteSize <= 4) return 2;
        if (paletteSize <= 16) return 4;
        return 8;
    }
}

