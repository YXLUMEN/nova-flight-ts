import {GCM_NONCE_BYTES} from "./GCMHelper.ts";
import {NonceExhaustedError} from "../../type/errors.ts";

const MAX_FIXED = 0xffff_ffff;

export class NonceGenerator {
    private readonly nonce = new Uint8Array(GCM_NONCE_BYTES);
    private readonly view = new DataView(this.nonce.buffer);

    private hi = 0;
    private lo = 0;
    private exhausted = false;

    public constructor(fixed: number) {
        if (!Number.isSafeInteger(fixed)) {
            throw new TypeError('fixed must be a integer');
        }
        if (fixed < 0 || fixed > MAX_FIXED) {
            throw new RangeError('fixed must in [0,2^32-1]');
        }

        this.view.setUint32(0, fixed, true);
    }

    public next(): Uint8Array<ArrayBuffer> {
        if (this.exhausted) throw new NonceExhaustedError();
        if (this.hi === 0xffffffff && this.lo === 0xffffffff) {
            this.exhausted = true;
        }

        this.view.setUint32(4, this.hi, true);
        this.view.setUint32(8, this.lo, true);

        this.lo = (this.lo + 1) >>> 0;
        if (this.lo === 0) this.hi = (this.hi + 1) >>> 0;

        return this.nonce.slice();
    }

    public isExhausted(): boolean {
        return this.exhausted;
    }

    public used() {
        if (this.exhausted) {
            return 0xffff_ffff_ffff_ffffn;
        }
        return (BigInt(this.hi) << 32n) | BigInt(this.lo);
    }
}
