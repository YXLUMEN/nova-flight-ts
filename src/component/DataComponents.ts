import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {ComponentTypeBuilder, DataComponentType} from "./DataComponentType.ts";
import {Codecs} from "../serialization/Codecs.ts";
import type {UnaryOperator} from "../type/types.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {AttributeModifier} from "./type/AttributeModifier.ts";
import type {NbtCompound} from "../nbt/element/NbtCompound.ts";

export class DataComponents {
    public static readonly CUSTOM_DATA: DataComponentType<NbtCompound> = this.register("custom_data",
        builder => builder.persistent(Codecs.NBT_COMPOUND)
    );

    public static readonly MAX_STACK_SIZE: DataComponentType<number> = this.register("max_stack_size",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.UINT32)
    );
    public static readonly MAX_DURABILITY: DataComponentType<number> = this.register("max_durability",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.UINT32)
    );
    public static readonly DURABILITY: DataComponentType<number> = this.register("durability",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.UINT32)
    );
    public static readonly UNBREAKABLE: DataComponentType<boolean> = this.register("unbreakable",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly CUSTOM_NAME: DataComponentType<string> = this.register("custom_name",
        builder => builder.persistent(Codecs.STRING).network(PacketCodecs.STRING)
    );
    public static readonly ITEM_AVAILABLE: DataComponentType<boolean> = this.register("item_available",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly ATTRIBUTE_MODIFIERS: DataComponentType<AttributeModifier> = this.register("attribute_modifiers",
        builder => builder.persistent(AttributeModifier.CODEC).network(AttributeModifier.PACKET_CODEC)
    );

    public static readonly UI_COLOR: DataComponentType<string> = this.register("ui_color",
        builder => builder.persistent(Codecs.STRING).network(PacketCodecs.COLOR_HEX)
    );
    public static readonly ATTACK_DAMAGE: DataComponentType<number> = this.register("attack_damage",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly MAX_COOLDOWN: DataComponentType<number> = this.register("max_cooldown",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.UINT32)
    );
    public static readonly COOLDOWN: DataComponentType<number> = this.register("cooldown",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.UINT32)
    );
    public static readonly EXPLOSION_RADIUS: DataComponentType<number> = this.register("explosion_radius",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly EXPLOSION_POWER: DataComponentType<number> = this.register("explosion_power",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly MAX_SPREAD: DataComponentType<number> = this.register("max_spread",
        builder => builder.persistent(Codecs.FLOAT).network(PacketCodecs.FLOAT)
    );

    public static readonly RELOADING: DataComponentType<boolean> = this.register("reloading",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly MAX_RELOAD_TIME: DataComponentType<number> = this.register("max_reload",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.VAR_UINT)
    );

    public static readonly FIRING: DataComponentType<boolean> = this.register("firing",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly OVERHEAT: DataComponentType<boolean> = this.register("overheat",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly MAX_HEAT: DataComponentType<number> = this.register("max_heat",
        builder => builder.persistent(Codecs.INT32).network(PacketCodecs.INT32)
    );
    public static readonly HEAT: DataComponentType<number> = this.register("heat",
        builder => builder.persistent(Codecs.INT32).network(PacketCodecs.INT32)
    );
    public static readonly DRAIN_RATE: DataComponentType<number> = this.register("drain_rate",
        builder => builder.persistent(Codecs.INT32).network(PacketCodecs.INT32)
    );
    public static readonly COOLDOWN_RATE: DataComponentType<number> = this.register("cooldown_rate",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly EFFECT_DURATION: DataComponentType<number> = this.register("effect_duration",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly EFFECT_TIME_LEFT: DataComponentType<number> = this.register("effect_time_left",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly EFFECT_RANGE: DataComponentType<number> = this.register("effect_range",
        builder => builder.persistent(Codecs.DOABLE).network(PacketCodecs.DOUBLE)
    );
    public static readonly ANY_BOOLEAN: DataComponentType<boolean> = this.register("any_bool",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly LAUNCH_COUNT: DataComponentType<number> = this.register("launch_count",
        builder => builder.persistent(Codecs.INT32).network(PacketCodecs.INT32)
    );
    public static readonly MISSILE_RANDOM_ENABLE: DataComponentType<boolean> = this.register("random_enable",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly WEAPON_CAN_COOLDOWN: DataComponentType<boolean> = this.register("finished_shooting",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );

    public static readonly MAX_DEFENSE: DataComponentType<number> = this.register("max_defence",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.UINT8)
    );
    public static readonly SCHEDULE_FIRE: DataComponentType<boolean> = this.register("schedule_fire",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly CHARGING_PROGRESS: DataComponentType<number> = this.register("charging_progress",
        builder => builder.persistent(Codecs.UINT32).network(PacketCodecs.VAR_UINT)
    );

    public static readonly WEAPON_TYPE: DataComponentType<number> = this.register("weapon_type",
        builder => builder.persistent(Codecs.INT8).network(PacketCodecs.INT8)
    );

    public static readonly ATTACK_RANGE: DataComponentType<number> = this.register('attack_range',
        builder => builder.persistent(Codecs.FLOAT).network(PacketCodecs.FLOAT)
    );
    public static readonly READY_TRIGGERED: DataComponentType<boolean> = this.register("ready_triggered",
        builder => builder.persistent(Codecs.BOOLEAN).network(PacketCodecs.BOOL)
    );
    public static readonly COOLDOWN_COUNTDOWN: DataComponentType<number> = this.register("cd_countdown",
        builder => builder.persistent(Codecs.INT32).network(PacketCodecs.INT32)
    );

    private static register<T>(id: string, builderOperator: UnaryOperator<ComponentTypeBuilder<T>>): DataComponentType<T> {
        const ide = Identifier.ofVanilla(id);
        const builder = new ComponentTypeBuilder<T>();
        const built = builderOperator(builder).build();
        return Registry.registerReferenceById(Registries.DATA_COMPONENT_TYPE, ide, built).getValue();
    }
}