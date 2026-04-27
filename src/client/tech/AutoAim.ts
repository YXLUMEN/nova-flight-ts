import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import {PI2, wrapRadians} from "../../utils/math/math.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {GlobalConfig} from "../../configs/GlobalConfig.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {BallisticsUtils} from "../../utils/math/BallisticsUtils.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export class AutoAim {
    public static readonly FIRE_THRESHOLD = Math.PI / 90;
    private readonly owner: ClientPlayerEntity;

    private currentTarget: MobEntity | null = null;
    private targetLockTime = 0;

    public constructor(owner: ClientPlayerEntity) {
        this.owner = owner;
    }

    public tick(): void {
        const world = this.owner.getWorld() as ClientWorld;
        const handItem = this.owner.getCurrentItem().getItem();
        if (!(handItem instanceof BaseWeapon)) return;

        const mobs = world.getMobs();
        if (mobs.size === 0) return;

        const pos = this.owner.positionRef;
        const target = this.acquireTarget(mobs, pos);
        if (!target) return;

        const mobPos = target.positionRef;
        const mobVel = target.velocityRef;
        const bulletSpeed = handItem.getBallisticSpeed();

        const targetYaw = BallisticsUtils.getLeadYaw(pos, mobPos, mobVel, bulletSpeed);
        this.owner.setClampYaw(targetYaw, 0.1963);

        const currentYaw = this.owner.getYaw();
        const yawDiff = Math.abs(wrapRadians(targetYaw - currentYaw));

        GlobalConfig.autoShoot = yawDiff <= AutoAim.FIRE_THRESHOLD;
    }

    public getTarget(): MobEntity | null {
        return this.currentTarget;
    }

    public setTarget(target: MobEntity | null): void {
        this.currentTarget = target;
    }

    private acquireTarget(mobs: ReadonlySet<MobEntity>, pos: Vec2) {
        const now = performance.now();

        if (this.currentTarget && !this.currentTarget.isRemoved() && now - this.targetLockTime < 500) {
            return this.currentTarget;
        }

        const ownerYaw = this.owner.getYaw();
        let best: Target | null = null;

        for (const mob of mobs) {
            if (mob.isRemoved() || mob.invulnerable) continue;

            const mobPos = mob.positionRef;
            const dx = mobPos.x - pos.x;
            const dy = mobPos.y - pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 1E-6) continue;

            const mobVel = mob.velocityRef;
            const approaching = (dx * mobVel.x + dy * mobVel.y) < 0;

            let angleDiff = Math.atan2(dy, dx) - ownerYaw;
            angleDiff = ((angleDiff + Math.PI) % PI2) - Math.PI;

            const absAngleDiff = Math.abs(angleDiff);

            if (!best ||
                (distSq < best.dist2) ||
                (distSq === best.dist2 && approaching && !best.approaching) ||
                (distSq === best.dist2 && approaching === best.approaching && absAngleDiff < best.angleDiff)
            ) {
                best = {mob, dist2: distSq, angleDiff: absAngleDiff, approaching};
            }
        }

        if (best) {
            this.currentTarget = best.mob;
            this.targetLockTime = now;
        }
        return this.currentTarget;
    }
}

type Target = { mob: MobEntity; dist2: number; angleDiff: number; approaching: boolean };