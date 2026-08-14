import type {Codec, Decoder, Encoder} from "../Codec.ts";
import {type DataResult} from "../result/DataResult.ts";
import type {NbtElement} from "../../nbt/element/NbtElement.ts";

export class CodecImpl<A> implements Codec<A> {
    private readonly encoder: Encoder<A>;
    private readonly decoder: Decoder<A>;
    private readonly name: string;

    public constructor(encoder: Encoder<A>, decoder: Decoder<A>, name: string) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.name = name;
        Object.freeze(this);
    }

    public encode(value: A): NbtElement {
        return this.encoder(value);
    }

    public decode(input: NbtElement): DataResult<A> {
        return this.decoder(input);
    }

    public toString(): string {
        return this.name;
    }
}