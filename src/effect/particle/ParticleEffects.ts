import {ParticleEffectType} from "./ParticleEffectType.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {Registry} from "../../registry/Registry.ts";
import {ParticleShape} from "./ParticleShape.ts";

export class ParticleEffects {
    public static readonly TRAJECTORY = this.register('trajectory',
        ParticleEffectType.builder()
            .life(8, 12)
            .size(2, 3)
            .colors('#fffce999', '#bcbcbc99')
            .build()
    );

    public static readonly EXPLOSION = this.register('explosion',
        ParticleEffectType.builder()
            .life(8, 18)
            .size(2, 4)
            .colors('#ff9940', '#ffddb8b3')
            .speed(6, 16)
            .acc(0.99)
            .omnidirectional()
            .build()
    );

    public static readonly EXPLOSION_DEBRIS = this.register('explosion_debris',
        ParticleEffectType.builder()
            .life(6, 12)
            .size(3, 5)
            .colors('#ff4422')
            .speed(4, 10)
            .acc(0.995)
            .omnidirectional()
            .build()
    );

    public static readonly SPARK = this.register('spark',
        ParticleEffectType.builder()
            .life(3, 8)
            .size(1, 3)
            .colors('#dedede')
            .speed(2.5, 3.5)
            .symmetry(0.5235)
            .acc(0.955)
            .build()
    );

    public static readonly MUZZLE_SPARK = this.register('muzzle_spark',
        ParticleEffectType.builder()
            .life(8, 12)
            .size(2, 3)
            .colors('#ffaa33', '#ff5454')
            .speed(5, 12)
            .symmetry(0.42)          // ~24°
            .acc(0.96)
            .build()
    );

    public static readonly SMOKE = this.register('smoke',
        ParticleEffectType.builder()
            .life(16, 32)
            .size(4, 10)
            .colors('#A0A0A099')
            .speed(1, 3)
            .omnidirectional()
            .acc(0.985)
            .build()
    );

    public static readonly LARGE_SMOKE = this.register('large_smoke',
        ParticleEffectType.builder()
            .life(400, 600)
            .size(24, 36)
            .recession(-0.8)
            .colors('#a0a0a0')
            .speed(0.5, 4)
            .omnidirectional()
            .acc(0.955)
            .build()
    );

    public static readonly EMBER = this.register('ember',
        ParticleEffectType.builder()
            .life(12, 24)
            .size(4, 8)
            .colors('#ffd16b', '#cab981')
            .speed(0.5, 1.5)
            .build()
    );

    public static readonly HIT = this.register('hit',
        ParticleEffectType.builder()
            .life(4, 12)
            .size(4, 6)
            .colors('#ffaa33', '#ff5454')
            .speed(1, 3)
            .omnidirectional()
            .build()
    );

    public static readonly SHIELD_HIT = this.register('shield_hit',
        ParticleEffectType.builder()
            .life(4, 12)
            .size(6, 8)
            .shape(ParticleShape.TRIANGLE)
            .colors('#5095ff', '#73c4ff')
            .speed(0.5, 1.5)
            .omnidirectional()
            .rotation(-Math.PI, Math.PI)
            .build()
    );

    public static readonly ENTITY_DEATH = this.register('entity_death',
        ParticleEffectType.builder()
            .life(12, 16)
            .size(4, 6)
            .colors('#ffaa33', '#ff5454')
            .speed(4, 5)
            .omnidirectional()
            .build()
    );

    public static readonly POWER_FULL_BLOW = this.register('power_full_blow',
        ParticleEffectType.builder()
            .life(10, 12)
            .size(4, 6)
            .colors('#ffd8b6')
            .speed(5, 7)
            .symmetry(Math.PI / 6)
            .build()
    );

    public static readonly ASH = this.register('ash',
        ParticleEffectType.builder()
            .life(16, 32)
            .size(1, 3)
            .colors('#A0A0A099')
            .speed(1.5, 3.5)
            .omnidirectional()
            .acc(0.985)
            .build()
    );

    public static readonly BURST = this.register('burst',
        ParticleEffectType.builder()
            .life(16, 24)
            .size(1, 3)
            .colors('#ffd88c')
            .speed(5, 8)
            .symmetry(Math.PI / 8)
            .build()
    );

    public static readonly DECOY_FLASH = this.register('decoy_flash',
        ParticleEffectType.builder()
            .life(16, 24)
            .size(1, 2)
            .colors('#ffd88c')
            .speed(2.5, 4)
            .omnidirectional()
            .build()
    );

    public static readonly SHIELD_CRASH = this.register('shield_crash',
        ParticleEffectType.builder()
            .life(8, 16)
            .size(8, 10)
            .colors('#5095FFCC', '#86B5FFCC')
            .speed(10, 12.5)
            .rotation(-Math.PI, Math.PI)
            .shape(ParticleShape.TRIANGLE)
            .omnidirectional()
            .build()
    );

    public static readonly FLUSH = this.register('flush',
        ParticleEffectType.builder()
            .life(16, 24)
            .size(5, 7)
            .colors('#8D8EFF80', '#FFFFFF99')
            .speed(11, 15)
            .shape(ParticleShape.CIRCLE)
            .omnidirectional()
            .build()
    );

    public static readonly BLOCK_DESTROY = this.register('block_destroy',
        ParticleEffectType.builder()
            .life(10, 20)
            .size(4, 6)
            .colors('#797979')
            .speed(2.5, 5)
            .rotation(-Math.PI, Math.PI)
            .shape(ParticleShape.RECT)
            .omnidirectional()
            .build()
    );

    public static readonly EXHAUST = this.register('exhaust',
        ParticleEffectType.builder()
            .life(20, 30)
            .size(4, 6)
            .colors('#986900', '#575757')
            .speed(-0.1, 0.1)
            .acc(0.985)
            .build()
    );

    public static readonly TELEPORT = this.register('teleport',
        ParticleEffectType.builder()
            .life(7, 16)
            .size(2, 5)
            .colors('#e4dcff', '#8a6dff00')
            .speed(4, 11)
            .omnidirectional()
            .acc(0.964)
            .build()
    );

    private static register(id: string, type: ParticleEffectType): ParticleEffectType {
        return Registry.registerReferenceById(
            Registries.PARTICLES,
            Identifier.ofVanilla(id),
            type,
        ).getValue();
    }
}
