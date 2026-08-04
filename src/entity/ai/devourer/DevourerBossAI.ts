import type {NbtCompound} from "../../../nbt/element/NbtCompound.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";
import type {EntityAi} from "../EntityAi.ts";
import type {DevourerBoss} from "../../mob/DevourerBoss.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {randInt} from "../../../utils/math/math.ts";
import {DevourerAttack} from "./DevourerAttack.ts";
import type {Supplier} from "../../../type/types.ts";
import type {ProjectileEntity} from "../../projectile/ProjectileEntity.ts";


export class DevourerBossAI implements EntityAi {
    private readonly entity: DevourerBoss;
    private readonly attack: DevourerAttack;
    private readonly bulletSupplier: Supplier<ProjectileEntity>;

    private bulletCD: number = 60;
    private missileCD: number = 200;
    private laserCD: number = 300;
    private laserGridCD = 320;

    private readonly phaseBulletCd = [45, 28, 28, 18];
    private readonly phaseMissileCd = [300, 240, 240, 160];

    private disabled = false;
    private sinOffset: number = 0;
    private sinAmplitude: number = 80;

    public readonly targetPos: MutVec2 = MutVec2.zero();

    public constructor(entity: DevourerBoss, bulletSupplier: Supplier<ProjectileEntity>) {
        this.entity = entity;
        this.bulletSupplier = bulletSupplier.bind(this.entity);
        this.attack = new DevourerAttack(entity);
    }

    public tick() {
        const world = this.entity.getWorld() as ServerWorld;
        this.tickMovement();
        this.tickAttacks(world);
    }

    private tickMovement(): void {
        const intent = this.computeIntent(
            this.entity.positionRef,
            this.entity.target()?.positionRef ?? null,
            this.entity.getPhase(),
            this.entity.age,
            this.entity.getMovementSpeed()
        );

        if (intent.speed > 0.001) {
            this.entity.setClampYaw(intent.targetYaw, this.entity.turnRate);
        }

        const yaw = this.entity.getYaw();
        this.entity.setVelocity(Math.cos(yaw) * intent.speed, Math.sin(yaw) * intent.speed);
        this.entity.needSync = true;
    }

    private tickAttacks(world: ServerWorld): void {
        const phase = this.entity.getPhase();
        const target = this.entity.target();

        if (this.bulletCD-- <= 0) {
            this.bulletCD = this.phaseBulletCd[phase];
            this.attack.fireBulletSpread(world, target, phase, this.bulletSupplier);
        }

        if (this.missileCD-- <= 0) {
            this.missileCD = this.phaseMissileCd[phase];
            this.attack.tryFireMissiles(world, target, phase);
        }

        if (phase === DevourerPhase.PHASE_2 && this.laserGridCD-- <= 0) {
            this.laserGridCD = randInt(260, 320);
            this.attack.fireLaserGrid(world);
        }

        if (phase === DevourerPhase.PHASE_3 && this.laserCD-- <= 0) {
            this.laserCD = randInt(240, 300);
            this.attack.fireSkyLaser(world, target);

            let counts = 0;
            const schedule = world.scheduleInterval(1, () => {
                if (counts++ >= 3) {
                    schedule.cancel();
                    return;
                }
                this.attack.fireLaserGrid(world);
            });
        }

        this.attack.tickSegmentAttacks(world, target, this.bulletSupplier);
    }

    public computeIntent(
        pos: Vec2,
        target: Vec2 | null,
        phase: DevourerPhase,
        age: number,
        baseSpeed: number
    ): MoveIntent {
        if (!target) return this.wanderIntent(age, baseSpeed);
        this.targetPos.set(target.x, target.y);

        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return this.chaseIntent(dx, dy, dist, age, baseSpeed, phase);
    }

    private chaseIntent(
        dx: number, dy: number, dist: number,
        age: number,
        speed: number,
        phase: DevourerPhase
    ): MoveIntent {
        if (dist < 0.001) return {targetYaw: 0, speed: 0};

        const nx = dx / dist;
        const ny = dy / dist;

        const perpX = -ny;
        const perpY = nx;

        const freq = phase === DevourerPhase.PHASE_3 ? 0.08 :
            phase === DevourerPhase.PHASE_2 ? 0.055 : 0.035;

        this.sinAmplitude = phase === DevourerPhase.PHASE_3 ? 140 :
            phase === DevourerPhase.PHASE_2 ? 110 : 80;

        this.sinOffset = age * freq;
        const sinVal = Math.sin(this.sinOffset) * this.sinAmplitude;

        const chaseSpeed = phase === DevourerPhase.PHASE_3 ? speed * 2 :
            phase === DevourerPhase.PHASE_2 ? speed * 1.6 : speed;

        const vx = nx * chaseSpeed + perpX * sinVal * 0.04;
        const vy = ny * chaseSpeed + perpY * sinVal * 0.04;

        return {targetYaw: Math.atan2(vy, vx), speed: Math.sqrt(vx * vx + vy * vy)};
    }

    private wanderIntent(age: number, speed: number): MoveIntent {
        return {targetYaw: age * 0.02, speed: speed * 0.5};
    }

    public decision(): void {
    }

    public setSeed(): void {
    }

    public isDisabled(): boolean {
        return this.disabled;
    }

    public setDisabled(disabled: boolean): void {
        this.disabled = disabled;
    }

    public isSimple(): boolean {
        return false;
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        nbt.setInt8('bullet_cd', this.bulletCD);
        nbt.setInt16('missile_cd', this.missileCD);
        nbt.setInt16('laser_cd', this.laserCD);
        return nbt;
    }

    public readNBT(nbt: NbtCompound): void {
        this.bulletCD = nbt.getInt8('bullet_cd', 60);
        this.missileCD = nbt.getInt16('missile_cd', 200);
        this.laserCD = nbt.getInt8('laser_cd', 300);
    }
}

export const enum DevourerPhase {
    PHASE_1,
    PHASE_2,
    PHASE_2_TO_3,
    PHASE_3,
}

export interface MoveIntent {
    targetYaw: number;
    speed: number;
}