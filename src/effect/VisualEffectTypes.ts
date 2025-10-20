import {type VisualEffect} from "./VisualEffect.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {EdgeGlowEffect} from "./EdgeGlowEffect.ts";
import {EMPBurst} from "./EMPBurst.ts";
import {LaserBeamEffect} from "./LaserBeamEffect.ts";
import {Particle} from "./Particle.ts";
import {RadialRing} from "./RadialRing.ts";
import {ScreenFlash} from "./ScreenFlash.ts";
import {WindowOverlay} from "./WindowOverlay.ts";
import {VisualEffectType} from "./VisualEffectType.ts";

export class VisualEffectTypes {
    public static readonly EDGE_GLOW: VisualEffectType<EdgeGlowEffect> = this.registry('edge_glow',
        VisualEffectType.create(EdgeGlowEffect, EdgeGlowEffect.PACKET_CODEC)
    );
    public static readonly EMP_BURST: VisualEffectType<EMPBurst> = this.registry('emp_burst',
        VisualEffectType.create(EMPBurst, EMPBurst.PACKET_CODEC)
    );
    public static readonly LASER_BEAM: VisualEffectType<LaserBeamEffect> = this.registry('laser_beam',
        VisualEffectType.create(LaserBeamEffect, LaserBeamEffect.PACKET_CODEC)
    );
    public static readonly PARTICLE: VisualEffectType<Particle> = this.registry('particle',
        VisualEffectType.create(Particle, Particle.PACKET_CODEC)
    );
    public static readonly RADIAL_RING: VisualEffectType<RadialRing> = this.registry('radial_ring',
        VisualEffectType.create(RadialRing, RadialRing.PACKET_CODEC)
    );
    public static readonly SCREEN_FLASH: VisualEffectType<ScreenFlash> = this.registry('screen_flight',
        VisualEffectType.create(ScreenFlash, ScreenFlash.PACKET_CODEC)
    );
    public static readonly WINDOW_OVERLAY: VisualEffectType<WindowOverlay> = this.registry('window_overlay',
        VisualEffectType.create(WindowOverlay, WindowOverlay.PACKET_CODEC)
    );

    private static registry<T extends VisualEffect>(
        id: string,
        effect: VisualEffectType<T>
    ): VisualEffectType<T> {
        return Registry.registerReferenceById(Registries.EFFECT_TYPE, Identifier.ofVanilla(id), effect).getValue();
    }
}