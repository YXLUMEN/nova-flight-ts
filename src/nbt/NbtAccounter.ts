import {IllegalArgumentError, NbtSizeValidationException} from "../type/errors.ts";

export class NbtAccounter {
    private readonly quota: number;
    private usage: number = 0;

    private readonly maxDepth: number;
    private depth: number = 0;

    public constructor(quota: number, maxDepth: number) {
        this.quota = quota
        this.maxDepth = maxDepth;
    }

    public static of(maxBytes: number) {
        return new NbtAccounter(maxBytes, 512);
    }

    public static ofUnlimitedBytes() {
        return new NbtAccounter(Number.MAX_SAFE_INTEGER, 512);
    }

    public accountMulti(multiplier: number, size: number) {
        this.account(multiplier * size);
    }

    public account(size: number) {
        if (size < 0) {
            throw new IllegalArgumentError(`Tried to account NBT tag with negative size: ${size}`);
        }

        if (this.usage + size > this.quota) {
            throw new NbtSizeValidationException(
                `Tried to read NBT tag that was too big; tried to allocate: ${this.usage} + ${size} bytes where max allowed: ${this.quota}`
            );
        }

        this.usage += size;
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