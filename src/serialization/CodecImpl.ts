import type {NbtElement} from "../nbt/element/NbtElement.ts";
import type {Codec} from "./Codec.ts";
import type {Return} from "../type/types.ts";

export class CodecImpl<A, T extends NbtElement> implements Codec<A> {
    private readonly encoder: Return<A, T>;
    private readonly decoder: Return<T, A | null>;

    public constructor(encoder: Return<A, T>, decoder: Return<T, A | null>) {
        this.encoder = encoder;
        this.decoder = decoder;
    }

    public encode(value: any): NbtElement {
        return this.encoder(value);
    }

    public decode(value: T): A | null {
        return this.decoder(value);
    }
}