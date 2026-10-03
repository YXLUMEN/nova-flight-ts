import type {Consumer} from "../../type/types.ts";

export type ParticleArray = Float32Array | Uint32Array | Uint16Array | Uint8Array;

export class ParticleLayout {
    public readonly arrays: ParticleArray[] = [];

    public f32(capacity: number): Float32Array {
        const buffer = new Float32Array(capacity);
        this.arrays.push(buffer);
        return buffer;
    }

    public u32(capacity: number): Uint32Array {
        const buffer = new Uint32Array(capacity);
        this.arrays.push(buffer);
        return buffer;
    }

    public u8(capacity: number): Uint8Array {
        const buffer = new Uint8Array(capacity);
        this.arrays.push(buffer);
        return buffer;
    }

    public forEach(action: Consumer<ParticleArray>): void {
        for (let i = 0; i < this.arrays.length; i++) {
            action(this.arrays[i]);
        }
    }
}