import {PackedData} from "./PackedData.ts";
import {LinearPalette} from "./LinearPalette.ts";
import {WorldConstants} from "../WorldConstants.ts";
import {type PaletteResize, RESIZE_FAIL} from "./PaletteResize.ts";
import type {IndexedIterable} from "../../../utils/collection/IndexedIterable.ts";
import type {Palette} from "./Palette.ts";
import type {BiConsumer, Consumer} from "../../../type/types.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {Serializable} from "../../../serialization/Seriable.ts";

export class PalettedContainer<T> implements PaletteResize<T>, Serializable {
    private static readonly BITS_PER_AXIS = WorldConstants.SECTION_SIZE_LOG2;
    private readonly registry: IndexedIterable<T>;

    private single: T;
    private palette: Palette<T> | null = null;
    private data: PackedData | null = null;

    public constructor(single: T, register: IndexedIterable<T>) {
        this.registry = register;
        this.single = single;
    }

    public onResize(size: number, lastAddValue: T): number {
        const maxSize = Math.min(size, 256);
        this.palette = this.palette!.upgrade(maxSize);

        const requiredBitWidth = PackedData.computeBitWidth(this.palette.length);
        if (this.data !== null && requiredBitWidth > this.data.getBitWidth()) {
            this.data = this.data.upgrade(requiredBitWidth);
        }

        return this.palette!.idFor(lastAddValue, RESIZE_FAIL);
    }

    public get(x: number, y: number): T {
        if (this.palette === null) return this.single;
        return this.palette.valueFor(this.data!.getByPos(x, y));
    }

    public set(x: number, y: number, value: T): void {
        if (this.palette === null) {
            if (this.single === value) return;
            this.expandToPalette();
        }

        const id = this.palette!.idFor(value, this);
        this.data!.setByPos(x, y, id);
    }

    public getAndSet(x: number, y: number, value: T): T {
        if (this.palette === null) {
            const prev = this.single;
            if (this.single !== value) {
                this.expandToPalette();
                this.data!.setByPos(0, 0, this.palette!.idFor(value, this));
            }
            return prev;
        }

        const id = this.palette!.idFor(value, this);
        const index = this.data!.getIndex(x, y);
        const oldId = this.data!.get(index);
        this.data!.set(index, id);
        return this.palette.valueFor(oldId);
    }

    private expandToPalette(): void {
        this.palette = new LinearPalette(2, [this.single]);
        this.data = new PackedData(PalettedContainer.BITS_PER_AXIS, 1);
        this.data.fill(0);
    }

    public tryCompact(): void {
        if (this.palette === null || this.palette.length !== 1) {
            return;
        }

        const rawData = this.data!.getRawData();
        const firstByte = rawData[0];
        for (let i = 1; i < rawData.length; i++) {
            if (rawData[i] !== firstByte) {
                return;
            }
        }

        this.single = this.palette.valueFor(this.data!.get(0));
        this.palette = null;
        this.data = null;
    }

    public count(output: BiConsumer<T, number>): void {
        if (!this.data) {
            output(this.single, 256);
            return;
        }

        if (this.palette!.length === 1) {
            output(this.palette!.valueFor(0), this.data.getCapacity());
            return;
        }

        const counts = new Map<number, number>();
        this.data.foreach(state => {
            const count = counts.get(state) ?? 0;
            counts.set(state, count + 1);
        });
        counts.forEach((key, value) => {
            output(this.palette!.valueFor(key), value);
        });
    }

    public isUniform(): boolean {
        return this.palette === null;
    }

    public getSingle(): T {
        return this.single;
    }

    public getDataSize(): number {
        return this.data === null ? 0 : this.data.getDataSize();
    }

    public getBitWidth(): number {
        return this.data === null ? 0 : this.data.getBitWidth();
    }

    /**
     * 获取Palette长度
     */
    public getPaletteSize(): number {
        return this.palette === null ? 1 : this.palette.length;
    }

    /**
     * 遍历Palette中的所有值
     */
    public foreachPaletteValue(consumer: Consumer<T>): void {
        if (this.palette === null) {
            consumer(this.single);
            return;
        }

        for (let i = 0; i < this.palette.length; i++) {
            consumer(this.palette.valueFor(i));
        }
    }

    public getRawData(): Uint8Array | null {
        return this.data === null ? null : this.data.getRawData();
    }

    public write(writer: BinaryWriter): void {
        writer.writeBoolean(this.palette !== null);

        if (this.palette === null) {
            writer.writeVarUint(this.registry.getIndex(this.single));
            return;
        }

        writer.writeInt8(this.data!.getBitWidth());

        writer.writeVarUint(this.palette.length);
        this.palette.write(writer, this.registry);

        const data = this.data!.getRawData();
        writer.writeVarUint(data.length);
        writer.pushBytes(data);
    }

    public read(reader: BinaryReader): void {
        const hasPalette = reader.readBoolean();

        if (!hasPalette) {
            const valueIndex = reader.readVarUint();
            this.single = this.registry.getByIndexOrThrow(valueIndex);
            return;
        }

        const bitWidth = reader.readUint8();
        const paletteSize = reader.readVarUint();

        const palette = new LinearPalette<T>(Math.max(paletteSize, 2));
        palette.read(reader, this.registry);

        const dataLength = reader.readVarUint();
        const rawData = reader.readSlice(dataLength);

        const data = PackedData.fromCapacity(
            WorldConstants.SECTION_BLOCK_COUNT,
            bitWidth,
            rawData
        );

        this.palette = palette;
        this.data = data;
        this.single = palette.valueFor(0);
    }

    public static unpack<T>(reader: BinaryReader, single: T, registry: IndexedIterable<T>): PalettedContainer<T> {
        const container = new PalettedContainer<T>(single, registry);
        container.read(reader);
        return container;
    }
}