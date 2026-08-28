import type {VisualEffect} from "./VisualEffect.ts";
import {VisualEffectType} from "./VisualEffectType.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {EdgeGlowEffect} from "./EdgeGlowEffect.ts";
import {EMPBurst} from "./EMPBurst.ts";
import {LaserBeamEffect} from "./LaserBeamEffect.ts";
import {CircleParticle} from "./CircleParticle.ts";
import {RadialRing} from "./RadialRing.ts";
import {ScreenFlash} from "./ScreenFlash.ts";
import {WindowOverlay} from "./WindowOverlay.ts";
import {ArcEffect} from "./ArcEffect.ts";
import {TitleEffect} from "./TitleEffect.ts";
import type {Consumer} from "../type/types.ts";

export class VisualEffectTypes {
    public static readonly EDGE_GLOW: VisualEffectType<EdgeGlowEffect> = this.registry('edge_glow',
        VisualEffectType.create(EdgeGlowEffect.PACKET_CODEC), val => EdgeGlowEffect.TYPE = val
    );
    public static readonly EMP_BURST: VisualEffectType<EMPBurst> = this.registry('emp_burst',
        VisualEffectType.create(EMPBurst.PACKET_CODEC), val => EMPBurst.TYPE = val
    );
    public static readonly LASER_BEAM: VisualEffectType<LaserBeamEffect> = this.registry('laser_beam',
        VisualEffectType.create(LaserBeamEffect.PACKET_CODEC), val => LaserBeamEffect.TYPE = val
    );
    public static readonly PARTICLE: VisualEffectType<CircleParticle> = this.registry('particle',
        VisualEffectType.create(CircleParticle.PACKET_CODEC), val => CircleParticle.TYPE = val
    );
    public static readonly RADIAL_RING: VisualEffectType<RadialRing> = this.registry('radial_ring',
        VisualEffectType.create(RadialRing.PACKET_CODEC), val => RadialRing.TYPE = val
    );
    public static readonly SCREEN_FLASH: VisualEffectType<ScreenFlash> = this.registry('screen_flight',
        VisualEffectType.create(ScreenFlash.PACKET_CODEC), val => ScreenFlash.TYPE = val
    );
    public static readonly WINDOW_OVERLAY: VisualEffectType<WindowOverlay> = this.registry('window_overlay',
        VisualEffectType.create(WindowOverlay.PACKET_CODEC), val => WindowOverlay.TYPE = val
    );
    public static readonly ARC: VisualEffectType<ArcEffect> = this.registry('arc',
        VisualEffectType.create(ArcEffect.PACKET_CODEC), val => ArcEffect.TYPE = val
    );
    public static readonly TITLE: VisualEffectType<TitleEffect> = this.registry('title',
        VisualEffectType.create(TitleEffect.PACKET_CODEC), val => TitleEffect.TYPE = val
    );

    private static registry<T extends VisualEffect>(
        id: string,
        effect: VisualEffectType<T>,
        inject: Consumer<VisualEffectType<T>>
    ): VisualEffectType<T> {
        const value = Registry.registerReferenceById(
            Registries.VISUAL_EFFECT_TYPE,
            Identifier.ofVanilla(id),
            effect
        ).getValue();
        inject(value);
        return value;
    }

    public static init() {
    }
}