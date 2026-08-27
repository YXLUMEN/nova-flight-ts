import {BossEntity} from "./BossEntity.ts";
import {getNearestEntityByVec, HALF_PI, rand, randInt, thickLineCircleHit} from "../../utils/math/math.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {Entity} from "../Entity.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MobMissileEntity} from "../projectile/MobMissileEntity.ts";
import {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {FireWave} from "../ai/FireWave.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {SmokeBomb} from "../projectile/SmokeBomb.ts";
import {spawnLaser} from "../../utils/ServerEffect.ts";
import {ScreenShakeS2CPacket} from "../../network/packet/s2c/ScreenShakeS2CPacket.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";

export class BaseBossEntity extends BossEntity {
    private attackCooldown: number = 0;
    private missileCooldown: number = 100;
    private smokeCooldown: number = 20;
    private laserCooldown: number = 200;

    private releasingMissile: boolean = false;

    private primaryTarget: Entity | null = null;
    private targetYaw: number = 1.57079;
    private selectCooldown = 0;

    private bulletWaves: FireWave[] = [
        new FireWave(5, 4),
        new FireWave(6, 4.5, 0, false, 0),
        new FireWave(6, 3, 4, false, 0),
        new FireWave(6, 6, 0, true, 0),
    ];

    private fireOffsets = [
        new Vec2(0, 0),
        new Vec2(-81, -16),
        new Vec2(81, -16),
    ];

    public constructor(type: EntityType<BossEntity>, world: World, worth: number, maxKillTime: number = 56) {
        super(type, world, worth, maxKillTime);
        this.setMovementSpeed(0.08);
        this.createBullet = this.createBullet.bind(this);
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

        if (this.primaryTarget) {
            const pos = this.primaryTarget.positionRef;
            const self = this.positionRef;
            this.targetYaw = Math.atan2(pos.y - self.y, pos.x - self.x);
        } else {
            this.targetYaw = 1.57079;
        }

        if (this.selectCooldown-- <= 0) {
            this.primaryTarget = getNearestEntityByVec(this.positionRef, world.getPlayers());
            this.selectCooldown = this.primaryTarget === null ? 20 : 60;
        }

        if (this.attackCooldown-- <= 0) {
            this.fireMainBarrage(world);
        }

        if (this.smokeCooldown-- <= 0) {
            this.releaseSmoke(world);
        }

        if (this.laserCooldown-- <= 0) {
            this.laser(world);
        }

        if (!this.releasingMissile && this.missileCooldown-- <= 0) {
            this.tryFireMissiles(world);
        }
    }

    private fireMainBarrage(world: ServerWorld): void {
        const extraCD = this.hasStatusEffect(StatusEffects.EMC_STATUS) ? 50 : 0;
        this.attackCooldown = randInt(15, 40) + extraCD;

        const basePos = this.positionRef.clone().add(0, this.getDimensions().halfHeight);

        for (let i = 0; i < this.fireOffsets.length; i++) {
            const offset = this.fireOffsets[i];
            const firePos = basePos.clone().add(offset.x, offset.y);

            if (i !== 0 || !this.primaryTarget) {
                const side = i === 1 ? 1 : -1;
                const centerAngle = 1.57079 + side * HALF_PI; // ±90°
                const startAngle = centerAngle - 0.7; // ～80° 宽度
                const endAngle = centerAngle + 0.7;

                this.bulletWaves[0].fireBulletWaveVec(world, this.createBullet, firePos, startAngle, endAngle);
                continue;
            }

            const targetPos = this.primaryTarget.positionRef;
            const aimAngle = Math.atan2(targetPos.y - firePos.y, targetPos.x - firePos.x);

            // 90° 扇形
            const faceStartAngle = aimAngle - 0.785398;
            const faceEndAngle = aimAngle + 0.785398;

            for (let i = 1; i < this.bulletWaves.length; i++) {
                const wave = this.bulletWaves[i];
                const startAngle = wave.face ? faceStartAngle : 0.4537722; // 26
                const endAngle = wave.face ? faceEndAngle : 2.6859825; // 154

                wave.fireBulletWaveVec(world, this.createBullet, firePos, startAngle, endAngle, () => !this.isRemoved());
            }
        }
    }

    private releaseSmoke(world: ServerWorld): void {
        this.smokeCooldown = randInt(500, 600);

        const basePos = this.positionRef.clone().add(-58, 0);

        let times = 0;
        const schedule = world.scheduleInterval(0.3, () => {
            if (times++ > 8 || this.isRemoved()) {
                schedule.cancel();
                return;
            }

            const yaw = this.targetYaw + rand(-0.785398, 0.785398);
            const smoke = new SmokeBomb(EntityTypes.SMOKE_BOMB, world, this, 0);
            smoke.setPositionByVec(basePos);
            smoke.setVelocity(Math.cos(yaw) * 8, Math.sin(yaw) * 8);
            smoke.color.color = '#9d9d9d';
            smoke.color.edge = '#ff2424';
            world.spawnEntity(smoke);
        });
    }

    private tryFireMissiles(world: ServerWorld): void {
        if (Math.random() > 0.4) return;

        this.releasingMissile = true;
        this.missileCooldown = randInt(320, 400);

        const pos = this.positionRef.clone().add(56, this.getDimensions().halfHeight);
        let i = 1;
        const schedule = world.scheduleInterval(0.3, () => {
            if (i++ > 6 || this.isRemoved()) {
                schedule.cancel();
                this.releasingMissile = false;
                return;
            }

            const yaw = this.getYaw();
            const missile = new MobMissileEntity(EntityTypes.MOB_MISSILE_ENTITY, world, this, yaw);

            missile.color.color = '#ff7777';
            missile.setPosition(pos.x, pos.y);
            missile.setYaw(yaw);
            world.spawnEntity(missile);
        });
    }

    private laser(world: ServerWorld) {
        this.laserCooldown = randInt(450, 500);
        if (!this.primaryTarget) return;

        const start = this.positionRef.clone().add(58, 0);
        const target = this.primaryTarget.positionRef;

        const x = (target.x - start.x) * World.MAP_HEIGHT * 2;
        const y = (target.y - start.y) * World.MAP_HEIGHT * 2;

        spawnLaser(world,
            start.x, start.y,
            x, y,
            '#ff2828',
            5,
            0.75
        );

        world.schedule(0.8, () => {
            const damageSource = world.getDamageSources()
                .laser(this)
                .setShieldMulti(0.5);

            for (const player of world.getPlayers()) {
                const pPos = player.positionRef;
                if (thickLineCircleHit(
                    start.x, start.y,
                    x, y,
                    6,
                    pPos.x, pPos.y,
                    player.getDimensions().halfWidth
                )) {
                    player.takeDamage(damageSource, 4);
                }
            }

            spawnLaser(world, start.x, start.y, x, y, '#d91b1b', 12, 0.5);
            world.sendPacket(new ScreenShakeS2CPacket(0.4, 1));
            world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 1, 0.8);
        })
    }
}