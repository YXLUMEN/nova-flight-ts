import {BossEntity} from "./BossEntity.ts";
import {getNearestEntityByVec, HALF_PI, randInt} from "../../utils/math/math.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {Entity} from "../Entity.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MobMissileEntity} from "../projectile/MobMissileEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";
import {FireWave} from "../ai/FireWave.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export class BaseBossEntity extends BossEntity {
    protected attackCooldown: number = 0;
    protected missileCooldown: number = 0;

    protected releasingMissile: boolean = false;

    protected primaryTarget: Entity | null = null;
    protected selectCooldown = 0;

    protected bulletWaves: FireWave[] = [
        new FireWave(5, 4),
        new FireWave(8, 4.5, 0, false, 0),
        new FireWave(12, 3, 4, false, 0),
        new FireWave(10, 6, 0, true, 0),
    ];

    protected fireOffsets = [
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

        if (this.selectCooldown-- <= 0) {
            this.primaryTarget = getNearestEntityByVec(this.positionRef, world.getPlayers());
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

        const basePos = this.positionRef.clone().add(0, this.getHeight() / 2);

        for (let i = 0; i < this.fireOffsets.length; i++) {
            const offset = this.fireOffsets[i];
            const firePos = basePos.clone().add(offset.x, offset.y);

            if (i !== 0 || !this.primaryTarget) {
                const side = i === 1 ? 1 : -1;
                const centerAngle = 1.57079 + side * HALF_PI; // ±90°
                const startAngle = centerAngle - 0.7; // ～80° 宽度
                const endAngle = centerAngle + 0.7;

                this.bulletWaves[0].fireBulletWave(world, this.createBullet, firePos, startAngle, endAngle);
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

                wave.fireBulletWave(world, this.createBullet, firePos, startAngle, endAngle, () => !this.isRemoved());
            }
        }
    }

    private tryFireMissiles(world: ServerWorld): void {
        if (Math.random() > 0.4) return;

        this.releasingMissile = true;
        this.missileCooldown = randInt(320, 400);

        const pos = this.positionRef.clone().add(0, this.getHeight() / 2);
        let i = 1;
        const schedule = world.scheduleInterval(0.3, () => {
            if (i++ > 6 || this.isRemoved()) {
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
}