import type {DamageType} from "./DamageType.ts";
import type {Entity} from "../Entity.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import type {TagKey} from "../../registry/tag/TagKey.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {RegistryKey} from "../../registry/RegistryKey.ts";
import {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {Registries} from "../../registry/Registries.ts";

export class DamageSource {
    public static readonly PACKET_CODE = PacketCodec.of<DamageSource>(
        (value, writer) => {
            writer.writeString(value.getType());
        },
        reader => {
            const typeId = Identifier.PACKET_CODEC.decode(reader);
            const type = Registries.DAMAGE_TYPE.getEntryById(typeId)!;
            return new DamageSource(type);
        }
    );

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
            return this.source != null ? this.source.getPosition() : null;
        }
    }

    public getStoredPosition(): Vec2 | null {
        return this.position;
    }

    public isIn(...type: TagKey<DamageType>[]): boolean {
        return type.some((v: TagKey<DamageType>) => this.type.isIn(v));
    }

    public isOf(typeKey: RegistryKey<DamageType>) {
        return this.type.matchesKey(typeKey);
    }

    public getType(): DamageType {
        return this.type.getValue();
    }
}