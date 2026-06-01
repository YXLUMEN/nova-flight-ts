import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Registries} from "../../registry/Registries.ts";
import {AttributeCategory} from "./AttributeCategory.ts";


export class Attribute {
    public static readonly PACKET_CODEC: PacketCodec<Attribute> = PacketCodecs.registryValue(Registries.ATTRIBUTE);

    private readonly fallback: number;
    private tracked: boolean = false;
    private category: AttributeCategory = AttributeCategory.POSITIVE;

    protected constructor(fallback: number) {
        this.fallback = fallback;
    }

    public getDefaultValue() {
        return this.fallback;
    }

    public isTracked(): boolean {
        return this.tracked;
    }

    public setTracked(tracked: boolean): Attribute {
        this.tracked = tracked;
        return this;
    }

    public setCategory(category: AttributeCategory): Attribute {
        this.category = category;
        return this;
    }

    public getCategory(): number {
        return this.category;
    }

    public clamp(value: number) {
        return value;
    }
}
