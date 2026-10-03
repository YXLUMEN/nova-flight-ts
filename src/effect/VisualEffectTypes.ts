import type {VisualEffect} from "./VisualEffect.ts";
import {VisualEffectType} from "./VisualEffectType.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {EdgeGlowEffect} from "./EdgeGlowEffect.ts";
import {EMPBurst} from "./EMPBurst.ts";
import {LaserBeamEffect} from "./LaserBeamEffect.ts";
import {RadialRing} from "./RadialRing.ts";
import {ScreenFlash} from "./ScreenFlash.ts";
import {WindowOverlay} from "./WindowOverlay.ts";
import {ArcEffect} from "./ArcEffect.ts";
import {AuraEffect} from "./AuraEffect.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";

export class VisualEffectTypes {
    public static EDGE_GLOW: VisualEffectType<EdgeGlowEffect>;
    public static EMP_BURST: VisualEffectType<EMPBurst>;
    public static LASER_BEAM: VisualEffectType<LaserBeamEffect>;
    public static RADIAL_RING: VisualEffectType<RadialRing>;
    public static SCREEN_FLASH: VisualEffectType<ScreenFlash>;
    public static WINDOW_OVERLAY: VisualEffectType<WindowOverlay>;
    public static ARC: VisualEffectType<ArcEffect>;
    public static SHIELD_AURA: VisualEffectType<AuraEffect>;

    public static init() {
        this.EDGE_GLOW = this.registry('edge_glow', VisualEffectType.create(EdgeGlowEffect.PACKET_CODEC));
        this.EMP_BURST = this.registry('emp_burst', VisualEffectType.create(EMPBurst.PACKET_CODEC));
        this.LASER_BEAM = this.registry('laser_beam', VisualEffectType.create(LaserBeamEffect.PACKET_CODEC));
        this.RADIAL_RING = this.registry('radial_ring', VisualEffectType.create(RadialRing.PACKET_CODEC));
        this.SCREEN_FLASH = this.registry('screen_flight', VisualEffectType.create(ScreenFlash.PACKET_CODEC));
        this.WINDOW_OVERLAY = this.registry('window_overlay', VisualEffectType.create(WindowOverlay.PACKET_CODEC));
        this.ARC = this.registry('arc', VisualEffectType.create(ArcEffect.PACKET_CODEC));
        this.SHIELD_AURA = this.registry('shield_aura', VisualEffectType.create(PacketCodecs.NEVER));
        Object.freeze(this);
    }

    private static registry<T extends VisualEffect>(id: string, effect: VisualEffectType<T>): VisualEffectType<T> {
        return Registry.registerReferenceById(
            Registries.VISUAL_EFFECT_TYPE,
            Identifier.ofVanilla(id),
            effect
        ).getValue();
    }
}