import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {ComponentType} from "./ComponentType.ts";
import {AttributeModifiersComponent} from "./type/AttributeModifiersComponent.ts";
import {CustomData} from "./type/CustomData.ts";

export class DataComponentTypes {
    public static readonly CUSTOM_DATA = this.register("custom_data", new ComponentType(CustomData));

    public static readonly MAX_STACK_SIZE: ComponentType<number> = this.register("max_stack_size", new ComponentType(1));
    public static readonly MAX_DURABILITY: ComponentType<number> = this.register("max_durability", new ComponentType(0));
    public static readonly DURABILITY: ComponentType<number> = this.register("durability", new ComponentType(0));
    public static readonly UNBREAKABLE: ComponentType<boolean> = this.register("unbreakable", new ComponentType(false));

    public static readonly ITEM_AVAILABLE: ComponentType<boolean> = this.register("item_available", new ComponentType(true));
    public static readonly ATTRIBUTE_MODIFIERS = this.register("attribute_modifiers", new ComponentType(AttributeModifiersComponent.DEFAULT));

    public static readonly UI_COLOR: ComponentType<string> = this.register("ui_color", new ComponentType('#fff'));

    public static readonly ATTACK_DAMAGE: ComponentType<number> = this.register("attack_damage", new ComponentType(1));
    public static readonly MAX_COOLDOWN: ComponentType<number> = this.register("max_cooldown", new ComponentType(1));
    public static readonly COOLDOWN: ComponentType<number> = this.register("cooldown", new ComponentType(0));
    public static readonly EXPLOSION_RADIUS: ComponentType<number> = this.register("explosion_radius", new ComponentType(0));
    public static readonly EXPLOSION_DAMAGE: ComponentType<number> = this.register("explosion_damage", new ComponentType(0));

    public static readonly ACTIVE: ComponentType<boolean> = this.register("active", new ComponentType(false));
    public static readonly OVERHEAT: ComponentType<boolean> = this.register("overheat", new ComponentType(false));
    public static readonly MAX_HEAT: ComponentType<number> = this.register("max_heat", new ComponentType(0));
    public static readonly HEAT: ComponentType<number> = this.register("heat", new ComponentType(0));
    public static readonly DRAIN_RATE: ComponentType<number> = this.register("drain_rate", new ComponentType(0));
    public static readonly COOLDOWN_RATE: ComponentType<number> = this.register("cooldown_rate", new ComponentType(0));

    public static readonly EFFECT_DURATION: ComponentType<number> = this.register("void_duration", new ComponentType(0));
    public static readonly EFFECT_TIME_LEFT: ComponentType<number> = this.register("void_time_left", new ComponentType(0));
    public static readonly EFFECT_RANGE: ComponentType<number> = this.register("void_damage_range", new ComponentType(0));
    public static readonly ANY_BOOLEAN: ComponentType<boolean> = this.register("void_prev_invincible", new ComponentType(false));

    public static readonly MISSILE_COUNT: ComponentType<number> = this.register("missile_count", new ComponentType(8));
    public static readonly MISSILE_RANDOM_ENABLE: ComponentType<boolean> = this.register("random_enable", new ComponentType(false));
    public static readonly WEAPON_CAN_COOLDOWN: ComponentType<boolean> = this.register("finished_shooting", new ComponentType(false));

    private static register<T>(id: string, type: ComponentType<T>): ComponentType<T> {
        return Registry.registerReferenceById(Registries.DATA_COMPONENT_TYPE, Identifier.ofVanilla(id), type).getValue();
    }
}