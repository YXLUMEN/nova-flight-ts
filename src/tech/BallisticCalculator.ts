import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {PI2} from "../utils/math/math.ts";
import type {BaseWeapon} from "../item/weapon/BaseWeapon/BaseWeapon.ts";
import type {ClientPlayerEntity} from "../client/entity/ClientPlayerEntity.ts";

export class BallisticCalculator {
    private owner: ClientPlayerEntity;
    private lockedTarget: MobEntity | null = null;

    public constructor(owner: ClientPlayerEntity) {
        this.owner = owner;
    }

    public tick(): void {
        if (this.owner.input.wasPressed('AltLeft')) {
            if (this.lockedTarget) {
                this.lockedTarget = null;
            } else {
                this.lockedTarget = this.findTargetUnderCursor();
            }
        }
    }

    private findTargetUnderCursor(): MobEntity | null {
        const world = this.owner.getWorld();
        const mobs = world.getMobs();
        if (mobs.size === 0) return null;

        const cursorWorldPos = this.owner.input.getPointer;
        let nearest: MobEntity | null = null;
        let nearestDist2 = Infinity;

        for (const mob of mobs.values()) {
            const mobPos = mob.getPositionRef;
            const dx = mobPos.x - cursorWorldPos.x;
            const dy = mobPos.y - cursorWorldPos.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < nearestDist2 && dist2 < 60 * 60) {
                nearestDist2 = dist2;
                nearest = mob;
            }
        }
        return nearest;
    }

    public drawAimIndicator(ctx: CanvasRenderingContext2D) {
        const target = this.lockedTarget;
        if (!target || target.isRemoved()) {
            this.lockedTarget = null;
            return;
        }

        const tPos = target.getPositionRef;
        const tVelocity = target.getVelocityRef;
        const oPos = this.owner.getPositionRef;

        const dx = tPos.x - oPos.x;
        const dy = tPos.y - oPos.y;
        const dist = Math.hypot(dx, dy);

        const bulletSpeed = (this.owner.getCurrentItemStack().getItem() as BaseWeapon).getBallisticSpeed();
        const t = dist / bulletSpeed;

        const leadX = tPos.x + tVelocity.x * t;
        const leadY = tPos.y + tVelocity.y * t;

        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tPos.x, tPos.y, 15, 0, PI2);

        ctx.strokeStyle = 'yellow';
        ctx.moveTo(leadX - 5, leadY);
        ctx.lineTo(leadX + 5, leadY);
        ctx.moveTo(leadX, leadY - 5);
        ctx.lineTo(leadX, leadY + 5);
        ctx.stroke();
        ctx.restore();
    }

    public getTarget() {
        return this.lockedTarget;
    }
}