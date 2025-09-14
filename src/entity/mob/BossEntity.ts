import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import {clamp, HALF_PI, PI2, rand} from "../../utils/math/math.ts";
import {BulletEntity} from "../projectile/BulletEntity.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {MissileEntity} from "../projectile/MissileEntity.ts";

export class BossEntity extends MobEntity {
    public color = '#b30000';

    private readonly maxDamageCanTake: number;
    private maxKillCounts = 48;
    private cooldown = 0;
    private damageCooldown: number = 0;
    protected yStep = 0;

    public constructor(type: EntityType<BossEntity>, world: World, worth: number) {
        super(type, world, worth);
        this.maxDamageCanTake = Math.floor(this.getMaxHealth() / this.maxKillCounts);
        this.setMovementSpeed(0.08);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 160)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 10);
    }

    public override tick() {
        super.tick();

        if (this.damageCooldown > 0) this.damageCooldown -= 1;
        this.cooldown -= 1;
        if (this.cooldown > 0) return;
        this.cooldown = rand(20, 100);

        const count = 16;
        const speed = 4;
        const startAngle = 0.4537722; // 26
        const endAngle = 2.6859825; // 154
        const step = (endAngle - startAngle) / (count - 1);
        const yOffset = this.getEntityDimension().height / 2;

        const world = this.getWorld();
        const pos = this.getPositionRef.clone().add(0, yOffset);
        for (let i = count; i--;) {
            const angle = startAngle + step * i;
            const vel = new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const b = new BulletEntity(EntityTypes.BULLET_ENTITY, world, this, 1);
            b.setVelocityByVec(vel);
            b.setPositionByVec(pos);
            b.color = '#ff0000'
            world.spawnEntity(b);
        }

        if (this.age % 12 !== 0) return;

        let i = 1;
        const schedule = world.scheduleInterval(0.3, () => {
            if (i++ > 8) {
                schedule.cancel();
                return;
            }
            const side = (i % 2 === 0) ? 1 : -1;
            const yaw = this.getYaw();

            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MissileEntity(EntityTypes.MISSILE_ENTITY, world, this, driftAngle, 'player');
            missile.color = '#ff7777'
            missile.setMaxLifeTick(400);
            missile.setTrackingSpeed(0.6);
            missile.setPosition(pos.x, pos.y);
            missile.setYaw(yaw);
            world.spawnEntity(missile);
        });
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.damageCooldown > 0) return false;

        const clampDamage = clamp((damage * 0.1) | 0, 1, this.maxDamageCanTake);
        if (super.takeDamage(damageSource, clampDamage)) {
            this.damageCooldown = 16;
            return true;
        }
        return false;
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);

        const world = this.getWorld();
        world.events.emit(EVENTS.BOSS_KILLED, {mob: this, damageSource});

        for (let i = 32; i--;) {
            const a = rand(0, PI2);
            const speed = rand(240, 360);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            world.spawnParticleByVec(
                this.getPositionRef, vel, rand(0.8, 1.4), rand(12, 24),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public override discard() {
        super.discard();
    }

    public override addStatusEffect(_effect: StatusEffectInstance) {
        return false;
    }

    public override attack(player: PlayerEntity) {
        const world = this.getWorld();
        player.takeDamage(
            world.getDamageSources().mobAttack(this), this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE));
    }
}