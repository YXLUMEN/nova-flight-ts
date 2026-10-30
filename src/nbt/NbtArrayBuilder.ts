import type {NbtElement} from "./element/NbtElement.ts";
import {NbtTypeId} from "./NbtType.ts";
import {NbtCompound} from "./element/NbtCompound.ts";
import {NbtInt8Array} from "./element/NbtInt8Array.ts";
import {NbtInt16Array} from "./element/NbtInt16Array.ts";
import {NbtInt32Array} from "./element/NbtInt32Array.ts";
import {NbtUint32Array} from "./element/NbtUint32Array.ts";
import {NbtStringArray} from "./element/NbtStringArray.ts";
import {NbtCompoundArray} from "./element/NbtCompoundArray.ts";
import {NbtEnd} from "./element/NbtEnd.ts";
import type {NbtUint8Array} from "./element/NbtUint8Array.ts";

export class NbtArrayBuilder {
    private readonly elements: NbtElement[];

    public constructor(elements?: NbtElement[]) {
        this.elements = elements ?? [];
    }

    public get length(): number {
        return this.elements.length;
    }

    public get(index: number): NbtElement | undefined {
        return this.elements[index];
    }

    public push(element: NbtElement): void {
        this.elements.push(element);
    }

    public unwrapPush(element: NbtElement): void {
        if (!(element instanceof NbtCompound)) {
            this.push(element);
            return;
        }

        if (element.size() === 1) {
            const inner = element.get('');
            this.push(inner === null ? element : inner);
            return;
        }
        this.push(element);
    }

    public iter() {
        return this.elements.values();
    }

    public clear(): void {
        this.elements.length = 0;
    }

    public build(): NbtElement {
        const type = this.identifyType();
        const elements = this.elements as RawNbt[];

        switch (type) {
            case NbtTypeId.Int8: {
                const array = new Int8Array(elements.length);
                for (let i = 0; i < elements.length; i++) {
                    array[i] = elements[i].value;
                }
                return new NbtInt8Array(array);
            }
            case NbtTypeId.Int16: {
                const array = new Int16Array(elements.length);
                for (let i = 0; i < elements.length; i++) {
                    array[i] = elements[i].value;
                }
                return new NbtInt16Array(array);
            }
            case NbtTypeId.Int32: {
                const array = new Int32Array(elements.length);
                for (let i = 0; i < elements.length; i++) {
                    array[i] = elements[i].value;
                }
                return new NbtInt32Array(array);
            }
            case NbtTypeId.Uint32: {
                const array = new Uint32Array(elements.length);
                for (let i = 0; i < elements.length; i++) {
                    array[i] = elements[i].value;
                }
                return new NbtUint32Array(array);
            }
            case NbtTypeId.String: {
                const array: string[] = new Array(elements.length).fill(null);
                for (let i = 0; i < elements.length; i++) {
                    array[i] = elements[i].value;
                }
                return new NbtStringArray(array);
            }
            case NbtTypeId.Compound:
                const array: NbtCompound[] = new Array(elements.length).fill(null);
                for (let i = 0; i < elements.length; i++) {
                    array[i] = elements[i].value;
                }
                return new NbtCompoundArray(array);
            case NbtTypeId.Int8Array:
            case NbtTypeId.Uint8Array:
            case NbtTypeId.Int16Array:
            case NbtTypeId.Int32Array:
            case NbtTypeId.Uint32Array:
            case NbtTypeId.StringArray:
            case NbtTypeId.CompoundArray:
                return this.buildArray(elements as ArrayNbt[]);
            default:
                return NbtEnd.INSTANCE;
        }
    }

    private buildArray(elements: ArrayNbt[]): NbtElement {
        if (elements.length === 0) return NbtEnd.INSTANCE;
        if (elements.length === 1) return elements[0];
        return new NbtCompoundArray(elements.map(e => new NbtCompound().set('', e)));
    }

    private identifyType(): NbtTypeId {
        let current = 0;

        for (const element of this.elements) {
            if (current === 0) {
                current = element.type();
                continue;
            }
            if (current !== element.type()) {
                current = NbtTypeId.Compound;
            }
        }
        return current;
    }

    public static wrap(element: NbtElement) {
        if (element instanceof NbtCompound) {
            if (element.size() === 1 && element.has('')) return element;
        }

        return new NbtCompound().set('', element);
    }
}

interface RawNbt extends NbtElement {
    value: any;
}

type ArrayNbt =
    NbtInt8Array
    | NbtUint8Array
    | NbtInt16Array
    | NbtInt32Array
    | NbtUint32Array
    | NbtStringArray
    | NbtCompoundArray;