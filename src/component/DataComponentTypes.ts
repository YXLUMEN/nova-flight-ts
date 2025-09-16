import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import type {ComponentType, Types} from "./ComponentType.ts";

export class DataComponentTypes {
    public static readonly MAX_STACK_SIZE: ComponentType<number> = this.register("max_stack_size", 0);
    public static readonly MAX_DAMAGE: ComponentType<number> = this.register("max_damage", 0);
    public static readonly DAMAGE: ComponentType<number> = this.register("damage", 0);
    public static readonly UNBREAKABLE: ComponentType<boolean> = this.register("unbreakable", true);

    public static readonly UI_COLOR: ComponentType<string> = this.register("ui_color", '#fff');

    public static readonly ATTACK_DAMAGE: ComponentType<number> = this.register("attack_damage", 0);
    public static readonly MAX_COOLDOWN: ComponentType<number> = this.register("max_cooldown", 0);
    public static readonly COOLDOWN: ComponentType<number> = this.register("cooldown", 0);

    public static readonly ACTIVE: ComponentType<boolean> = this.register("active", false);
    public static readonly OVERHEAT: ComponentType<boolean> = this.register("overheat", false);
    public static readonly MAX_HEAT: ComponentType<number> = this.register("max_heat", 0);
    public static readonly HEAT: ComponentType<number> = this.register("heat", 0);
    public static readonly DRAIN_RATE: ComponentType<number> = this.register("drain_rate", 0);
    public static readonly COOLDOWN_RATE: ComponentType<number> = this.register("cooldown_rate", 0);

    public static readonly EXPLOSION_RADIUS: ComponentType<number> = this.register("explosion_radius", 0);
    public static readonly EXPLOSION_DAMAGE: ComponentType<number> = this.register("explosion_damage", 0);

    public static readonly VOID_DURATION: ComponentType<number> = this.register("void_duration", 0);
    public static readonly VOID_DAMAGE_RANGE: ComponentType<number> = this.register("void_damage_range", 0);

    public static readonly MISSILE_COUNT: ComponentType<number> = this.register("missile_count", 0);
    public static readonly MISSILE_RANDOM_ENABLE: ComponentType<boolean> = this.register("random_enable", false);
    public static readonly MISSILE_FINISH_SHOOTING: ComponentType<boolean> = this.register("finished_shooting", false);

    private static register<T extends Types>(id: string, type: ComponentType<T>): ComponentType<T> {
        return Registry.registerReferenceById(Registries.DATA_COMPONENT_TYPE, Identifier.ofVanilla(id), type).getValue();
    }
}