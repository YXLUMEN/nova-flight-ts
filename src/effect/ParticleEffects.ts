import {ParticleEffectType} from "./ParticleEffectType.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";

export class ParticleEffects {
    public static readonly EXPLOSION = ParticleEffects.register('explosion',
        ParticleEffectType.builder()
            .life(0.4, 0.9)
            .size(3, 8)
            .colors('#ff9940', 'rgba(255,80,0,0)')
            .speed(120, 320)
            .omnidirectional()
            .withDrag(0.7)
            .build()
    );

    public static readonly EXPLOSION_DEBRIS = ParticleEffects.register('explosion_debris',
        ParticleEffectType.builder()
            .life(0.3, 0.6)
            .size(1.5, 4)
            .colors('#ff4422', 'rgba(100,20,0,0)')
            .speed(80, 200)
            .omnidirectional()
            .withDrag(0.5)
            .withGravity(60)
            .build()
    );

    public static readonly SPARK = ParticleEffects.register('spark',
        ParticleEffectType.builder()
            .life(0.15, 0.4)
            .size(1, 3)
            .colors('#ffffff', 'rgba(100,220,255,0)')
            .speed(150, 350)
            .omnidirectional()
            .withDrag(0.9)
            .build()
    );

    public static readonly MUZZLE_SPARK = ParticleEffects.register('muzzle_spark',
        ParticleEffectType.builder()
            .life(0.1, 0.35)
            .size(1, 2.5)
            .colors('#ffe066', 'rgba(255,140,0,0)')
            .speed(100, 250)
            .spread(0.42)          // ~24°
            .withDrag(0.8)
            .build()
    );

    public static readonly SMOKE = ParticleEffects.register('smoke',
        ParticleEffectType.builder()
            .life(0.8, 1.6)
            .size(4, 10)
            .colors('rgba(160,160,160,0.6)', 'rgba(80,80,80,0)')
            .speed(20, 60)
            .omnidirectional()
            .withDrag(0.3)
            .withGravity(-15)
            .build()
    );

    public static readonly EMBER = ParticleEffects.register('ember',
        ParticleEffectType.builder()
            .life(0.6, 1.2)
            .size(1, 2.5)
            .colors('#ffaa44', 'rgba(255,60,0,0)')
            .speed(30, 100)
            .omnidirectional()
            .withDrag(0.4)
            .withGravity(40)
            .build()
    );

    public static readonly EMP_SPARK = ParticleEffects.register('emp_spark',
        ParticleEffectType.builder()
            .life(0.2, 0.5)
            .size(2, 5)
            .colors('#44ffee', 'rgba(0,180,255,0)')
            .speed(100, 280)
            .omnidirectional()
            .withDrag(0.8)
            .build()
    );

    public static readonly LASER_IMPACT = ParticleEffects.register('laser_impact',
        ParticleEffectType.builder()
            .life(0.1, 0.3)
            .size(1.5, 4)
            .colors('#aaeeff', 'rgba(30,100,255,0)')
            .speed(200, 500)
            .omnidirectional()
            .withDrag(1.0)
            .build()
    );

    public static readonly HIT = ParticleEffects.register('hit',
        ParticleEffectType.builder()
            .life(0.2, 0.6)
            .size(4, 6)
            .colors('#ffaa33', '#ff5454')
            .speed(20, 60)
            .omnidirectional()
            .build()
    );

    public static readonly SHIELD_HIT = ParticleEffects.register('shield_hit',
        ParticleEffectType.builder()
            .life(0.2, 0.6)
            .size(4, 6)
            .colors('#5095ff', '#73c4ff')
            .speed(10, 30)
            .omnidirectional()
            .build()
    );

    public static readonly ENTITY_DEATH = ParticleEffects.register('entity_death',
        ParticleEffectType.builder()
            .life(0.6, 0.8)
            .size(4, 6)
            .colors('#ffaa33', '#ff5454')
            .speed(80, 100)
            .omnidirectional()
            .build()
    );

    public static readonly ENGINE_EXHAUST = ParticleEffects.register('engine_exhaust',
        ParticleEffectType.builder()
            .life(0.2, 0.5)
            .size(2, 5)
            .colors('#88ccff', 'rgb(40 100 255 / 0.1)')
            .speed(60, 140)
            .spread(0.3)
            .withDrag(0.5)
            .build()
    );

    public static readonly POWER_FULL_BLOW = ParticleEffects.register('power_full_blow',
        ParticleEffectType.builder()
            .life(0.5, 0.6)
            .size(4, 6)
            .colors('#ffd8b6')
            .speed(100, 140)
            .omnidirectional()
            .build()
    );

    private static register(id: string, type: ParticleEffectType): ParticleEffectType {
        return Registry.registerReferenceById(
            Registries.PARTICLES,
            Identifier.ofVanilla(id),
            type
        ).getValue();
    }
}
