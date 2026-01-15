import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import {clamp, getNearestEntity, HALF_PI, rand, randInt} from "../../utils/math/math.ts";
import {BulletEntity} from "../projectile/BulletEntity.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {MobMissileEntity} from "../projectile/MobMissileEntity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {Entity} from "../Entity.ts";

export class BossEntity extends MobEntity {
    public static hasBoss: boolean = false;

    public override color = '#b30000';
    public override yStep = 0;

    private readonly maxDamageCanTake: number;

    private attackCooldown: number = 0;
    private damageCooldown: number = 0;
    private missileCooldown: number = 0;

    private releasingMissile: boolean = false;

    private primaryTarget: Entity | null = null;
    private selectCooldown = 0;

    private readonly BULLET_WAVES = [
        {count: 8, speed: 4.5, delay: 0, face: false},
        {count: 12, speed: 3.0, delay: 4, face: false},
        {count: 10, speed: 4.0, delay: 0, face: true},
    ]

    private readonly FIRE_OFFSETS = [
        new Vec2(0, 0),
        new Vec2(-81, -16),
        new Vec2(81, -16),
    ];

    public constructor(type: EntityType<BossEntity>, world: World, worth: number, maxKillTime: number = 48) {
        super(type, world, worth);

        this.maxDamageCanTake = Math.floor(this.getMaxHealth() / maxKillTime);
        this.setMovementSpeed(0.08);
        BossEntity.hasBoss = true;
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 160)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 10);
    }

    public override tick() {
        super.tick();

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        if (this.damageCooldown > 0) this.damageCooldown -= 1

        if (this.selectCooldown-- <= 0) {
            this.primaryTarget = getNearestEntity(this.getPositionRef, world.getPlayers());
            this.selectCooldown = this.primaryTarget === null ? 20 : 60;
        }

        if (this.attackCooldown-- <= 0) {
            this.fireMainBarrage(world);
        }

        if (this.releasingMissile) return;

        if (this.missileCooldown-- <= 0) {
            this.tryFireMissiles(world);
        }
    }

    private fireMainBarrage(world: ServerWorld): void {
        const extraCD = this.hasStatusEffect(StatusEffects.EMC_STATUS) ? 50 : 0;
        this.attackCooldown = randInt(15, 40) + extraCD;

        const basePos = this.getPositionRef.clone().add(0, this.getHeight() / 2);

        for (let i = 0; i < this.FIRE_OFFSETS.length; i++) {
            const offset = this.FIRE_OFFSETS[i];
            const firePos = basePos.clone().add(offset.x, offset.y);

            if (i !== 0 || !this.primaryTarget) {
                const side = i === 1 ? 1 : -1;
                const centerAngle = 1.57079 + side * HALF_PI; // ±90°
                const startAngle = centerAngle - 0.7; // ～80° 宽度
                const endAngle = centerAngle + 0.7;

                this.fireBulletWave(world, firePos, startAngle, endAngle, 5, 4);
                continue;
            }

            const targetPos = this.primaryTarget.getPositionRef;
            const aimAngle = Math.atan2(targetPos.y - firePos.y, targetPos.x - firePos.x);

            // 90° 扇形
            const faceStartAngle = aimAngle - 0.785398;
            const faceEndAngle = aimAngle + 0.785398;

            for (const wave of this.BULLET_WAVES) {
                const startAngle = wave.face ? faceStartAngle : 0.4537722; // 26
                const endAngle = wave.face ? faceEndAngle : 2.6859825; // 154

                if (wave.delay === 0) {
                    this.fireBulletWave(world, firePos, startAngle, endAngle, wave.count, wave.speed);
                    continue;
                }

                world.schedule(wave.delay, () => {
                    if (this.isRemoved()) return;
                    this.fireBulletWave(world, firePos, startAngle, endAngle, wave.count, wave.speed);
                });
            }
        }
    }

    private tryFireMissiles(world: ServerWorld): void {
        if (Math.random() > 0.4) return;

        this.releasingMissile = true;
        this.missileCooldown = randInt(320, 400);

        const pos = this.getPositionRef.clone().add(0, this.getHeight() / 2);
        let i = 1;
        const schedule = world.scheduleInterval(0.3, () => {
            if (i++ > 4 || this.isRemoved()) {
                schedule.cancel();
                this.releasingMissile = false;
                return;
            }

            const side = (i % 2 === 0) ? 1 : -1;
            const yaw = this.getYaw();
            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MobMissileEntity(EntityTypes.MOB_MISSILE_ENTITY, world, this, driftAngle);
            missile.color = '#ff7777';
            missile.setPosition(pos.x, pos.y);
            missile.setYaw(yaw);
            world.spawnEntity(missile);
            world.getNetworkChannel().send(new MissileSetS2CPacket(missile.getId(), missile.driftAngle, missile.hoverDir));
        });
    }

    private fireBulletWave(
        world: ServerWorld,
        pos: IVec,
        startAngle: number,
        endAngle: number,
        count: number,
        speed: number
    ): void {
        const step = (endAngle - startAngle) / Math.max(1, count - 1);
        for (let i = 0; i < count; i++) {
            const angle = startAngle + step * i;
            const vel = new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const b = new BulletEntity(EntityTypes.ENEMY_BULLET_ENTITY, world, this, 1);
            b.setVelocityByVec(vel);
            b.setPositionByVec(pos);
            b.color = '#b10000';
            b.edgeColor = '#ff0000';
            world.spawnEntity(b);
        }
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.damageCooldown > 0 && !damageSource.isIn(DamageTypeTags.BYPASSES_INVULNERABLE)) return false;

        const clampDamage = clamp((damage * 0.1) | 0, 1, this.maxDamageCanTake);
        if (super.takeDamage(damageSource, clampDamage)) {
            this.damageCooldown = 16;
            return true;
        }
        return false;
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);
        BossEntity.hasBoss = false;

        const world = this.getWorld();
        world.events.emit(EVENTS.BOSS_KILLED, {mob: this, damageSource});
        if (world.isClient) return;

        const pos = this.getPositionRef;
        (world as ServerWorld).spawnParticle(
            pos.x, pos.y, 1, 1, 32,
            rand(240, 360),
            rand(0.8, 1.4), rand(12, 24),
            "#ffaa33", "#ff5454",
        );
    }

    public override attack(player: PlayerEntity) {
        const world = this.getWorld();
        player.takeDamage(
            world.getDamageSources().mobAttack(this), this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE));
    }
}