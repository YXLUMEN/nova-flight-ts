import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {ComponentType} from "./ComponentType.ts";
import {type Codec, Codecs} from "../codec/Codec.ts";

export class DataComponentTypes {
    // public static readonly CUSTOM_DATA = this.register("custom_data", new ComponentType(CustomData));

    public static readonly MAX_STACK_SIZE: ComponentType<number> = this.register("max_stack_size", Codecs.UINT);
    public static readonly MAX_DURABILITY: ComponentType<number> = this.register("max_durability", Codecs.UINT);
    public static readonly DURABILITY: ComponentType<number> = this.register("durability", Codecs.UINT);
    public static readonly UNBREAKABLE: ComponentType<boolean> = this.register("unbreakable", Codecs.BOOLEAN);

    public static readonly CUSTOM_NAME: ComponentType<string> = this.register("custom_name", Codecs.STRING);

    public static readonly ITEM_AVAILABLE: ComponentType<boolean> = this.register("item_available", Codecs.BOOLEAN);
    public static readonly ATTRIBUTE_MODIFIERS = this.register("attribute_modifiers", Codecs.ATTRIBUTE_MODIFIERS);

    public static readonly UI_COLOR: ComponentType<string> = this.register("ui_color", Codecs.STRING);

    public static readonly ATTACK_DAMAGE: ComponentType<number> = this.register("attack_damage", Codecs.DOABLE);
    public static readonly MAX_COOLDOWN: ComponentType<number> = this.register("max_cooldown", Codecs.DOABLE);
    public static readonly COOLDOWN: ComponentType<number> = this.register("cooldown", Codecs.DOABLE);
    public static readonly EXPLOSION_RADIUS: ComponentType<number> = this.register("explosion_radius", Codecs.DOABLE);
    public static readonly EXPLOSION_DAMAGE: ComponentType<number> = this.register("explosion_damage", Codecs.DOABLE);

    public static readonly ACTIVE: ComponentType<boolean> = this.register("active", Codecs.BOOLEAN);
    public static readonly OVERHEAT: ComponentType<boolean> = this.register("overheat", Codecs.BOOLEAN);
    public static readonly MAX_HEAT: ComponentType<number> = this.register("max_heat", Codecs.INT);
    public static readonly HEAT: ComponentType<number> = this.register("heat", Codecs.INT);
    public static readonly DRAIN_RATE: ComponentType<number> = this.register("drain_rate", Codecs.INT);
    public static readonly COOLDOWN_RATE: ComponentType<number> = this.register("cooldown_rate", Codecs.DOABLE);

    public static readonly EFFECT_DURATION: ComponentType<number> = this.register("void_duration", Codecs.DOABLE);
    public static readonly EFFECT_TIME_LEFT: ComponentType<number> = this.register("void_time_left", Codecs.DOABLE);
    public static readonly EFFECT_RANGE: ComponentType<number> = this.register("void_damage_range", Codecs.DOABLE);
    public static readonly ANY_BOOLEAN: ComponentType<boolean> = this.register("void_prev_invincible", Codecs.BOOLEAN);

    public static readonly MISSILE_COUNT: ComponentType<number> = this.register("missile_count", Codecs.INT);
    public static readonly MISSILE_RANDOM_ENABLE: ComponentType<boolean> = this.register("random_enable", Codecs.BOOLEAN);
    public static readonly WEAPON_CAN_COOLDOWN: ComponentType<boolean> = this.register("finished_shooting", Codecs.BOOLEAN);

    private static register<T>(id: string, codec: Codec<T>): ComponentType<T> {
        const ide = Identifier.ofVanilla(id);
        const type = new ComponentType(ide, codec);

        return Registry.registerReferenceById(Registries.DATA_COMPONENT_TYPE, ide, type).getValue();
    }
}