import type {DamageType} from "./DamageType.ts";
import type {Entity} from "../Entity.ts";
import type {Vec2} from "../../math/Vec2.ts";
import type {TagKey} from "../../registry/tag/TagKey.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";

export class DamageSource {
    private readonly type: RegistryEntry<DamageType>;
    private readonly attacker: Entity | null;
    private readonly source: Entity | null;
    private readonly position: Vec2 | null;

    public constructor(type: RegistryEntry<DamageType>, attacker: Entity | null = null, source: Entity | null = null, position: Vec2 | null = null) {
        this.type = type;
        this.attacker = attacker;
        this.source = source;
        this.position = position;
    }

    public isDirect(): boolean {
        return this.attacker === this.source;
    }

    public getSource(): Entity | null {
        return this.source;
    }

    public getAttacker(): Entity | null {
        return this.attacker;
    }

    public getPosition(): Vec2 | null {
        if (this.position != null) {
            return this.position;
        } else {
            return this.source != null ? this.source.getPos() : null;
        }
    }

    public getStoredPosition(): Vec2 | null {
        return this.position;
    }

    public isIn(...type: TagKey<DamageType>[]): boolean {
        return type.some((v: TagKey<DamageType>) => this.type.isIn(v));
    }

    public getType(): RegistryEntry<DamageType> {
        return this.type;
    }
}