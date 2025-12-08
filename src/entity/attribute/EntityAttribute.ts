import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Registries} from "../../registry/Registries.ts";

export const EntityAttributeCategory = {
    POSITIVE: 0,
    NEUTRAL: 1,
    NEGATIVE: 2
} as const;

export class EntityAttribute {
    public static readonly PACKET_CODEC: PacketCodec<EntityAttribute> = PacketCodecs.registryValue(Registries.ATTRIBUTE);

    private readonly fallback: number;
    private tracked: boolean = false;
    private category: 0 | 1 | 2 = EntityAttributeCategory.POSITIVE;

    protected constructor(fallback: number) {
        this.fallback = fallback;
    }

    public getDefaultValue() {
        return this.fallback;
    }

    public isTracked(): boolean {
        return this.tracked;
    }

    public setTracked(tracked: boolean): EntityAttribute {
        this.tracked = tracked;
        return this;
    }

    public setCategory(category: 0 | 1 | 2): EntityAttribute {
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
