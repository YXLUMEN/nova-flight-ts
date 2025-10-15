import type {IVec} from "../utils/math/IVec.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {PI2, wrapRadians} from "../utils/math/math.ts";
import type {BaseWeapon} from "../item/weapon/BaseWeapon/BaseWeapon.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import type {ClientWorld} from "../client/ClientWorld.ts";
import type {ClientPlayerEntity} from "../client/entity/ClientPlayerEntity.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";

export class AutoAim {
    public static readonly FIRE_THRESHOLD = Math.PI / 90;
    private readonly owner: ClientPlayerEntity;

    private readonly lockTargetPos = MutVec2.zero();
    private readonly lastTargetPos = MutVec2.zero();

    private currentTarget: MobEntity | null = null;
    private targetLockTime = 0;

    public constructor(owner: ClientPlayerEntity) {
        this.owner = owner;
    }

    public static getLeadYaw(shooterPos: IVec, targetPos: IVec, targetVel: IVec, bulletSpeed: number): number {
        const dx = targetPos.x - shooterPos.x;
        const dy = targetPos.y - shooterPos.y;
        const vx = targetVel.x;
        const vy = targetVel.y;

        const a = vx * vx + vy * vy - bulletSpeed * bulletSpeed;
        const b = 2 * (dx * vx + dy * vy);
        const c = dx * dx + dy * dy;

        let t: number;

        if (Math.abs(a) < 1e-6) {
            if (Math.abs(b) < 1e-6) return Math.atan2(dy, dx);
            // 退化为线性方程
            t = -c / b;
        } else {
            const disc = b * b - 4 * a * c;
            if (disc < 0) return Math.atan2(dy, dx); // 无解, 直接瞄准当前
            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b - sqrtDisc) / (2 * a);
            const t2 = (-b + sqrtDisc) / (2 * a);
            // 取最小正时间
            t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
        }

        if (t <= 0) return Math.atan2(dy, dx);

        const leadX = targetPos.x + vx * t;
        const leadY = targetPos.y + vy * t;

        return Math.atan2(leadY - shooterPos.y, leadX - shooterPos.x);
    }

    public tick(): void {
        const world = this.owner.getWorld() as ClientWorld;
        if (!world.isClient) return;

        const mobs = world.getMobs();
        if (mobs.size === 0) return;

        const pos = this.owner.getPositionRef;
        const target = this.acquireTarget(mobs, pos);
        if (!target) return;

        const mobPos = target.getPositionRef;
        const mobVel = target.getVelocityRef;
        const bulletSpeed = (this.owner.getCurrentItemStack().getItem() as BaseWeapon).getBallisticSpeed();

        this.lastTargetPos.set(this.lockTargetPos.x, this.lockTargetPos.y);
        const targetYaw = AutoAim.getLeadYaw(pos, mobPos, mobVel, bulletSpeed);
        this.lockTargetPos.set(Math.cos(targetYaw) + pos.x, Math.sin(targetYaw) + pos.y);
        this.owner.setClampYaw(targetYaw, 0.1963);

        const currentYaw = this.owner.getYaw();
        const yawDiff = Math.abs(wrapRadians(targetYaw - currentYaw));

        WorldConfig.autoShoot = yawDiff <= AutoAim.FIRE_THRESHOLD;
    }

    public getTarget(): MobEntity | null {
        return this.currentTarget;
    }

    public setTarget(target: MobEntity | null): void {
        this.currentTarget = target;
    }

    private acquireTarget(mobs: ReadonlySet<MobEntity>, pos: IVec) {
        const now = performance.now();

        if (this.currentTarget && !this.currentTarget.isRemoved() && now - this.targetLockTime < 500) {
            return this.currentTarget;
        }

        const ownerYaw = this.owner.getYaw();
        let best: { mob: MobEntity; dist2: number; angleDiff: number; approaching: boolean } | null = null;

        for (const mob of mobs) {
            if (mob.isRemoved()) continue;

            const mobPos = mob.getPositionRef;
            const dx = mobPos.x - pos.x;
            const dy = mobPos.y - pos.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 1E-6) continue;

            const mobVel = mob.getPositionRef;
            const relSpeed = ((dx * mobVel.x) + (dy * mobVel.y)) / Math.sqrt(dist2);
            const approaching = relSpeed < 0;

            let angleDiff = Math.atan2(dy, dx) - ownerYaw;
            angleDiff = ((angleDiff + Math.PI) % PI2) - Math.PI;

            const absAngleDiff = Math.abs(angleDiff);

            if (!best ||
                (dist2 < best.dist2) ||
                (dist2 === best.dist2 && approaching && !best.approaching) ||
                (dist2 === best.dist2 && approaching === best.approaching && absAngleDiff < best.angleDiff)
            ) {
                best = {mob, dist2, angleDiff: absAngleDiff, approaching};
            }
        }

        if (best) {
            this.currentTarget = best.mob;
            this.targetLockTime = now;
        }
        return this.currentTarget;
    }

    public getLockTargetPos(): Readonly<MutVec2> | null {
        return this.lockTargetPos.equalsSq(this.lastTargetPos) ? null : this.lockTargetPos;
    }
}