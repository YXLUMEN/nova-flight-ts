import {NbtSizeValidationException} from "../type/errors.ts";

export class NbtSizeTracker {
    private readonly maxBytes: number;
    private allocated: number = 0;

    private readonly maxDepth: number;
    private depth: number = 0;

    public constructor(maxBytes: number, maxDepth: number) {
        this.maxBytes = maxBytes
        this.maxDepth = maxDepth;
    }

    public static of(maxBytes: number) {
        return new NbtSizeTracker(maxBytes, 512);
    }

    public static ofUnlimitedBytes() {
        return new NbtSizeTracker(Number.MAX_SAFE_INTEGER, 512);
    }

    public addWithMulti(multiplier: number, size: number) {
        this.add(multiplier * size);
    }

    public add(size: number) {
        if (this.allocated + size > this.maxBytes) {
            throw new NbtSizeValidationException(
                `Tried to read NBT tag that was too big; tried to allocate: ${this.allocated} + ${size} bytes where max allowed: ${this.maxBytes}`
            );
        }

        this.allocated += size;
    }

    public pushStack() {
        if (this.depth >= this.maxDepth) {
            throw new NbtSizeValidationException(`Tried to read NBT tag with too high complexity, depth > ${this.maxDepth}`);
        }
        this.depth++;
    }

    public popStack() {
        if (this.depth <= 0) {
            throw new NbtSizeValidationException("NBT-Accounter tried to pop stack-depth at top-level");
        }
        this.depth--;
    }
}