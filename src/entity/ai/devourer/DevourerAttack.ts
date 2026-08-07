import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {HALF_PI, PI2, rand, randInt, randNeg, thickLineCircleHit} from "../../../utils/math/math.ts";
import type {Entity} from "../../Entity.ts";
import type {DevourerBoss} from "../../mob/DevourerBoss.ts";
import {DevourerPhase} from "./DevourerBossAI.ts";
import {FireWave} from "../FireWave.ts";
import type {Supplier} from "../../../type/types.ts";
import type {ProjectileEntity} from "../../projectile/ProjectileEntity.ts";
import {MobMissileEntity} from "../../projectile/MobMissileEntity.ts";
import {EntityTypes} from "../../EntityTypes.ts";
import {World} from "../../../world/World.ts";
import {spawnLaser} from "../../../utils/ServerEffect.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {ScreenShakeS2CPacket} from "../../../network/packet/s2c/ScreenShakeS2CPacket.ts";

export class DevourerAttack {
    private readonly entity: DevourerBoss;
    private readonly segFireCds: Uint8Array;
    private readonly bulletWaves: FireWave[] = [
        new FireWave(1, 14, 0, true, 0, 3.2),
        new FireWave(8, 11, 0, false, 0, 1.2),
        new FireWave(10, 8, 0, false, 0, 1.4),
        new FireWave(6, 9, 8, false, 0, PI2),
        new FireWave(4, 7, 0, true, 0, 1.6),
        new FireWave(6, 12, 0, false, 0, PI2 * 0.6),
        new FireWave(5, 10, 6, false, 0, PI2),
    ];

    public constructor(entity: DevourerBoss) {
        this.entity = entity;
        this.segFireCds = new Uint8Array(48);
        for (let i = 0; i < this.segFireCds.length; i++) {
            this.segFireCds[i] = 1 + i * 3;
        }
    }

    public fireBulletSpread(
        world: ServerWorld,
        target: Entity | null,
        phase: DevourerPhase,
        supplier: Supplier<ProjectileEntity>,
    ): void {
        if (!target) return;

        const yaw = this.entity.getYaw();
        const pos = this.entity.positionRef;
        const targetPos = target.positionRef;

        let start = 1;
        let end = 1;
        if (phase === DevourerPhase.PHASE_2) {
            start = 2;
            end = 3;
        } else if (phase === DevourerPhase.PHASE_3) {
            start = 4;
            end = 6;
        }

        const predicate = () => !this.entity.isRemoved() && this.entity.getPhase() !== DevourerPhase.PHASE_2_TO_3;
        for (let i = start; i < end + 1; i++) {
            const wave = this.bulletWaves[i];
            wave.fireWithSpread(
                world,
                supplier,
                pos,
                wave.resolveRadiusVec(pos, targetPos, yaw),
                predicate
            );
        }
    }

    public tickSegmentAttacks(
        world: ServerWorld,
        target: Entity | null,
        supplier: Supplier<ProjectileEntity>,
    ): void {
        if (!target || (this.entity.age & 2) !== 0) return;

        const pPos = target.positionRef;
        const wave = this.bulletWaves[0];

        for (let i = 0; i < this.segFireCds.length; i++) {
            if (this.segFireCds[i] > 0) {
                this.segFireCds[i]--;
                continue;
            }
            if (Math.random() > 0.04) continue;

            const idx = i << 1;
            const sx = this.entity.segPoses[idx];
            const sy = this.entity.segPoses[idx + 1];

            const angle = Math.atan2(pPos.y - sy, pPos.x - sx);
            wave.fireBulletWave(world, supplier, sx, sy, angle, angle);
            this.segFireCds[i] = 40 + (Math.random() * 10) | 0;
        }
    }

    public tryFireMissiles(world: ServerWorld, target: Entity | null, phase: DevourerPhase): void {
        if (phase === DevourerPhase.PHASE_1) return;
        if (!target) return;

        const missileCount = phase === DevourerPhase.PHASE_3 ? 4 : 2;
        const pos = this.entity.positionRef;
        let fired = 0;

        const interval = world.scheduleInterval(0.25, () => {
            if (fired++ >= missileCount || this.entity.isRemoved()) {
                interval.cancel();
                return;
            }

            const side = fired % 2 === 0 ? 1 : -1;
            const yaw = this.entity.getYaw();
            const driftAngle = yaw + side * (HALF_PI + randNeg(0, 0.3));

            const missile = new MobMissileEntity(EntityTypes.MOB_MISSILE_ENTITY, world, this.entity, driftAngle);
            missile.color = '#cc0000';
            missile.setPosition(pos.x, pos.y);
            missile.setYaw(yaw);
            world.spawnEntity(missile);
        });
    }

    public fireSkyLaser(world: ServerWorld, target: Entity | null): void {
        if (!target) return;

        const offset = rand(-50, 50);
        const tx = target.positionRef.x;

        const startX = tx + offset;
        const startY = -80;
        const endX = tx - offset;
        const endY = World.MAP_HEIGHT + 80;

        spawnLaser(world, startX, startY, endX, endY, '#ff1100', 5, 0.8);
        world.schedule(0.85, () => {
            const damageSource = world.getDamageSources()
                .laser(this.entity)
                .setShieldMulti(0.5);

            for (const player of world.getPlayers()) {
                const pPos = player.positionRef;
                if (thickLineCircleHit(
                    startX, startY,
                    endX, endY,
                    48,
                    pPos.x, pPos.y,
                    player.getDimensions().halfWidth
                )) {
                    player.takeDamage(damageSource, 15);
                }
            }

            spawnLaser(world, startX, startY, endX, endY, '#39008a', 24, 0.3);
            world.sendPacket(new ScreenShakeS2CPacket(0.4, 1));
            world.playSound(null, SoundEvents.ARC_BURST, 1, 0.8);
        });
    }

    public fireLaserGrid(world: ServerWorld): void {
        const spacing = 96;
        const margin = 80;
        const hitRadius = 4;

        const minX = randInt(-32, 32);
        const maxX = World.MAP_WIDTH;
        const minY = randInt(-32, 32);
        const maxY = World.MAP_HEIGHT;

        const lines: [number, number, number, number][] = [];

        for (let x = minX; x <= maxX; x += spacing) {
            lines.push([x, minY - margin, x, maxY + margin]);
        }
        for (let y = minY; y <= maxY; y += spacing) {
            lines.push([minX - margin, y, maxX + margin, y]);
        }

        for (const [sx, sy, ex, ey] of lines) {
            spawnLaser(world, sx, sy, ex, ey, '#ff1100', 2, 0.8);
        }

        world.schedule(0.85, () => {
            const source = world.getDamageSources()
                .laser(this.entity)
                .setShieldMulti(0.5);

            for (const player of world.getPlayers()) {
                const pPos = player.positionRef;
                const pR = player.getDimensions().halfWidth;
                for (const [sx, sy, ex, ey] of lines) {
                    if (thickLineCircleHit(sx, sy, ex, ey, hitRadius, pPos.x, pPos.y, pR)) {
                        player.takeDamage(source, 15);
                        break;
                    }
                }
            }

            for (const [sx, sy, ex, ey] of lines) {
                spawnLaser(world, sx, sy, ex, ey, '#372aff', 5, 0.3);
            }

            world.sendPacket(new ScreenShakeS2CPacket(0.4, 1));
            world.playSound(null, SoundEvents.ARC_BURST, 1, 0.8);
        });
    }
}