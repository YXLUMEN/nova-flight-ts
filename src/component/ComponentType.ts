import type {Identifier} from "../registry/Identifier.ts";
import type {Codec} from "../codec/Codec.ts";

export class ComponentType<T> {
    public readonly id: Identifier;
    public readonly codec: Codec<T>

    public constructor(id: Identifier, codec: Codec<T>) {
        this.id = id;
        this.codec = codec;
    }
}
