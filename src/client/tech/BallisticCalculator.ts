import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import {lerp, PI2} from "../../utils/math/math.ts";
import type {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";

export class BallisticCalculator {
    private owner: ClientPlayerEntity;
    private lockedTarget: MobEntity | null = null;
    private prevLeadX = 0;
    private prevLeadY = 0;

    public constructor(owner: ClientPlayerEntity) {
        this.owner = owner;
    }

    public tick(): void {
        if (!this.owner.input.wasPressed('ShiftLeft')) {
            return;
        }
        if (this.lockedTarget) {
            this.lockedTarget = null;
        } else {
            this.lockedTarget = this.findTargetUnderCursor();
            if (this.lockedTarget) {
                const {x, y} = this.lockedTarget.getPositionRef;
                this.prevLeadX = x;
                this.prevLeadY = y;
            }
        }
    }

    public drawAimIndicator(ctx: CanvasRenderingContext2D, tickDelta: number): void {
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

        let leadX = tPos.x + tVelocity.x * t;
        let leadY = tPos.y + tVelocity.y * t;

        leadX = lerp(tickDelta, this.prevLeadX, leadX);
        leadY = lerp(tickDelta, this.prevLeadY, leadY);
        this.prevLeadX = leadX;
        this.prevLeadY = leadY;

        ctx.save();
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
}