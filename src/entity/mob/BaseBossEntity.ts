import {BossEntity, type FireWave} from "./BossEntity.ts";
import {getNearestEntity, HALF_PI, randInt} from "../../utils/math/math.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {Entity} from "../Entity.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MobMissileEntity} from "../projectile/MobMissileEntity.ts";
import {BulletEntity} from "../projectile/BulletEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";

export class BaseBossEntity extends BossEntity {
    protected attackCooldown: number = 0;
    protected missileCooldown: number = 0;

    protected releasingMissile: boolean = false;

    protected primaryTarget: Entity | null = null;
    protected selectCooldown = 0;

    protected BULLET_WAVES: FireWave[] = [
        {count: 8, speed: 4.5, delay: 0, face: false, type: 0},
        {count: 12, speed: 3.0, delay: 4, face: false, type: 0},
        {count: 10, speed: 6.0, delay: 0, face: true, type: 0},
    ];

    protected FIRE_OFFSETS = [
        new Vec2(0, 0),
        new Vec2(-81, -16),
        new Vec2(81, -16),
    ];

    public constructor(type: EntityType<BossEntity>, world: World, worth: number, maxKillTime: number = 56) {
        super(type, world, worth, maxKillTime);
    }

    public override tick() {
        super.tick();

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

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

                this.fireBulletWave(world, firePos, startAngle, endAngle, 5, 4, 0);
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
                    this.fireBulletWave(world, firePos, startAngle, endAngle, wave.count, wave.speed, wave.type);
                    continue;
                }

                world.schedule(wave.delay, () => {
                    if (this.isRemoved()) return;
                    this.fireBulletWave(world, firePos, startAngle, endAngle, wave.count, wave.speed, wave.type);
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

    protected fireBulletWave(
        world: ServerWorld,
        pos: IVec,
        startAngle: number,
        endAngle: number,
        count: number,
        speed: number,
        _type: number,
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
}