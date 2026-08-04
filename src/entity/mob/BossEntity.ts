import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import {clamp, rand} from "../../utils/math/math.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MobBulletEntity} from "../projectile/MobBulletEntity.ts";
import type {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {BossKilled} from "../../event/events/BossKilled.ts";
import {BossSpawn} from "../../event/events/BossSpawn.ts";

export abstract class BossEntity extends MobEntity {
    public static hasBoss: boolean = false;

    public override color = '#b30000';
    public override verticalMovementDir = 0;

    private readonly maxDamageCanTake: number;
    private damageCooldown: number = 0;

    protected constructor(type: EntityType<BossEntity>, world: World, worth: number, maxKillTime: number) {
        super(type, world, worth);

        this.maxDamageCanTake = Math.floor(this.getMaxHealth() / maxKillTime);
        BossEntity.hasBoss = true;

        world.events.emit(new BossSpawn(this));
    }

    public override tick() {
        super.tick();
        if (this.damageCooldown > 0) this.damageCooldown--;
    }

    public override isPushAble(): boolean {
        return false;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.damageCooldown > 0 && !damageSource.isIn(DamageTypeTags.BYPASSES_INVULNERABLE)) return false;

        const attacker = damageSource.getAttacker();
        if (!attacker || !attacker.isPlayer()) damage = 0.1;

        const clampDamage = clamp(damage, 0.1, this.maxDamageCanTake);
        if (super.takeDamage(damageSource, clampDamage)) {
            this.damageCooldown = 10;
            return true;
        }
        return false;
    }

    public override canHaveEffect(effect: StatusEffectInstance): boolean {
        return effect.getEffect() !== StatusEffects.EROSION;
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);
        BossEntity.hasBoss = false;

        const world = this.getWorld();
        if (world.isClient) return;

        const pos = this.positionRef;
        (world as ServerWorld).spawnParticle(
            pos.x, pos.y, 1, 1, 32,
            rand(240, 360),
            rand(0.8, 1.4), rand(12, 24),
            "#ffaa33", "#ff5454",
        );
    }

    protected override onDiscard() {
        super.onDiscard();
        this.getWorld().events.emit(new BossKilled(this));
    }

    public override attack(player: PlayerEntity) {
        const world = this.getWorld();
        player.takeDamage(
            world.getDamageSources().mobAttack(this), this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE));
    }

    protected createBullet(): MobBulletEntity {
        return new MobBulletEntity(EntityTypes.ENEMY_BULLET_ENTITY, this.getWorld(), this, 4);
    }
}