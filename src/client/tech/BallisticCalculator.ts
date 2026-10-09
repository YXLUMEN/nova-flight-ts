import {lerp, TAU} from "../../utils/math/math.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";
import {InputBindings} from "../input/InputBindings.ts";
import {AABB} from "../../utils/math/AABB.ts";
import {EntityPredicates} from "../../world/predicate/EntityPredicates.ts";
import type {Entity} from "../../entity/Entity.ts";
import {getNearestEntity} from "../../utils/math/collide.ts";

export class BallisticCalculator {
    private readonly owner: LocalPlayerEntity;
    private lockedTarget: Entity | null = null;
    private prevLeadX = 0;
    private prevLeadY = 0;

    public constructor(owner: LocalPlayerEntity) {
        this.owner = owner;
    }

    public tick(): void {
        if (!this.owner.input.wasPressed(InputBindings.INVENTORY_SWAP)) {
            return;
        }
        if (this.lockedTarget) {
            this.lockedTarget = null;
        } else {
            this.lockedTarget = this.findTargetUnderCursor();
            if (this.lockedTarget) {
                const {x, y} = this.lockedTarget.positionRef;
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

        const handItem = this.owner.getCurrentItem().getItem();
        if (!(handItem instanceof BaseWeapon)) return;

        const tPos = target.positionRef;
        const tVelocity = target.velocityRef;
        const oPos = this.owner.positionRef;

        const dx = tPos.x - oPos.x;
        const dy = tPos.y - oPos.y;
        const dist = Math.hypot(dx, dy);

        const bulletSpeed = handItem.getBallisticSpeed();
        const t = bulletSpeed > 0 ? dist / bulletSpeed : 0;

        let leadX = tPos.x + tVelocity.x * t;
        let leadY = tPos.y + tVelocity.y * t;

        leadX = lerp(tickDelta, this.prevLeadX, leadX);
        leadY = lerp(tickDelta, this.prevLeadY, leadY);
        this.prevLeadX = leadX;
        this.prevLeadY = leadY;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tPos.x, tPos.y, 15, 0, TAU);

        ctx.strokeStyle = 'yellow';
        ctx.moveTo(leadX - 5, leadY);
        ctx.lineTo(leadX + 5, leadY);
        ctx.moveTo(leadX, leadY - 5);
        ctx.lineTo(leadX, leadY + 5);
        ctx.stroke();
        ctx.restore();
    }

    private findTargetUnderCursor(): Entity | null {
        const world = this.owner.getWorld();
        const mobs = world.getMobs();
        if (mobs.size === 0) return null;

        const {x, y} = this.owner.input.getWorldPointer();
        const candidates = world.searchOtherEntities(
            this.owner,
            AABB.fromCenter(x, y, 16, 16),
            EntityPredicates.MOB
        )

        return getNearestEntity(x, y, candidates);
    }
}