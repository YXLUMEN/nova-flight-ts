import type {PaletteResize} from "./PaletteResize.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {IndexedIterable} from "../../../utils/collection/IndexedIterable.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";


export interface Palette<T> {
    idFor(value: T, onResize: PaletteResize<T>): number;

    valueFor(index: number): T;

    has(value: T): boolean;

    read(reader: BinaryReader, map: IndexedIterable<T>): void;

    write(writer: BinaryWriter, map: IndexedIterable<T>): void;

    get length(): number;

    upgrade(size: number): Palette<T>;
}