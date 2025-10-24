import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {ComponentType, ComponentTypeBuilder} from "./ComponentType.ts";
import {Codecs} from "../serialization/Codecs.ts";
import type {UnaryOperator} from "../apis/types.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {AttributeModifiersComponent} from "./type/AttributeModifiersComponent.ts";

export class DataComponentTypes {
    // public static readonly CUSTOM_DATA = this.register("custom_data", new ComponentType(CustomData));

    public static readonly MAX_STACK_SIZE: ComponentType<number> = this.register("max_stack_size",
        builder => builder.withCodec(Codecs.UINT).withPacketCodec(PacketCodecs.UINT32)
    );
    public static readonly MAX_DURABILITY: ComponentType<number> = this.register("max_durability",
        builder => builder.withCodec(Codecs.UINT).withPacketCodec(PacketCodecs.UINT32)
    );
    public static readonly DURABILITY: ComponentType<number> = this.register("durability",
        builder => builder.withCodec(Codecs.UINT).withPacketCodec(PacketCodecs.UINT32)
    );
    public static readonly UNBREAKABLE: ComponentType<boolean> = this.register("unbreakable",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );
    public static readonly CUSTOM_NAME: ComponentType<string> = this.register("custom_name",
        builder => builder.withCodec(Codecs.STRING).withPacketCodec(PacketCodecs.STRING)
    );
    public static readonly ITEM_AVAILABLE: ComponentType<boolean> = this.register("item_available",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );
    public static readonly ATTRIBUTE_MODIFIERS: ComponentType<AttributeModifiersComponent> = this.register("attribute_modifiers",
        builder => builder.withCodec(AttributeModifiersComponent.CODEC).withPacketCodec(AttributeModifiersComponent.PACKET_CODEC)
    );

    public static readonly UI_COLOR: ComponentType<string> = this.register("ui_color",
        builder => builder.withCodec(Codecs.STRING).withPacketCodec(PacketCodecs.STRING)
    );
    public static readonly ATTACK_DAMAGE: ComponentType<number> = this.register("attack_damage",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly MAX_COOLDOWN: ComponentType<number> = this.register("max_cooldown",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly COOLDOWN: ComponentType<number> = this.register("cooldown",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly EXPLOSION_RADIUS: ComponentType<number> = this.register("explosion_radius",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly EXPLOSION_DAMAGE: ComponentType<number> = this.register("explosion_damage",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );

    public static readonly ACTIVE: ComponentType<boolean> = this.register("active",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );
    public static readonly OVERHEAT: ComponentType<boolean> = this.register("overheat",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );
    public static readonly MAX_HEAT: ComponentType<number> = this.register("max_heat",
        builder => builder.withCodec(Codecs.INT).withPacketCodec(PacketCodecs.INT32)
    );
    public static readonly HEAT: ComponentType<number> = this.register("heat",
        builder => builder.withCodec(Codecs.INT).withPacketCodec(PacketCodecs.INT32)
    );
    public static readonly DRAIN_RATE: ComponentType<number> = this.register("drain_rate",
        builder => builder.withCodec(Codecs.INT).withPacketCodec(PacketCodecs.INT32)
    );
    public static readonly COOLDOWN_RATE: ComponentType<number> = this.register("cooldown_rate",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly EFFECT_DURATION: ComponentType<number> = this.register("void_duration",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly EFFECT_TIME_LEFT: ComponentType<number> = this.register("void_time_left",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly EFFECT_RANGE: ComponentType<number> = this.register("void_damage_range",
        builder => builder.withCodec(Codecs.DOABLE).withPacketCodec(PacketCodecs.DOUBLE)
    );
    public static readonly ANY_BOOLEAN: ComponentType<boolean> = this.register("void_prev_invincible",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );
    public static readonly MISSILE_COUNT: ComponentType<number> = this.register("missile_count",
        builder => builder.withCodec(Codecs.INT).withPacketCodec(PacketCodecs.INT32)
    );
    public static readonly MISSILE_RANDOM_ENABLE: ComponentType<boolean> = this.register("random_enable",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );
    public static readonly WEAPON_CAN_COOLDOWN: ComponentType<boolean> = this.register("finished_shooting",
        builder => builder.withCodec(Codecs.BOOLEAN).withPacketCodec(PacketCodecs.BOOL)
    );

    private static register<T>(id: string, builderOperator: UnaryOperator<ComponentTypeBuilder<T>>): ComponentType<T> {
        const ide = Identifier.ofVanilla(id);
        const builder = new ComponentTypeBuilder<T>();
        const built = builderOperator(builder).build();
        return Registry.registerReferenceById(Registries.DATA_COMPONENT_TYPE, ide, built).getValue();
    }
}