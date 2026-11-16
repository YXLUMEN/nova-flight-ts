import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";
import type {Entity} from "../../entity/Entity.ts";
import {lerp, TAU} from "../../utils/math/math.ts";
import {getNearestEntity} from "../../utils/math/collide.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {InputBindings} from "../input/InputBindings.ts";
import {AABB} from "../../utils/math/AABB.ts";
import {EntityPredicates} from "../../world/predicate/EntityPredicates.ts";

export class BallisticCalculator {
    private readonly owner: LocalPlayerEntity;
    private lockedTarget: Entity | null = null;

    public constructor(owner: LocalPlayerEntity) {
        this.owner = owner;
    }

    public tick(): void {
        if (!this.owner.input.wasPressed(InputBindings.BC)) {
            return;
        }
        if (this.lockedTarget) {
            this.lockedTarget = null;
        } else {
            this.lockedTarget = this.findTargetUnderCursor();
        }
    }

    public drawAimIndicator(ctx: CanvasRenderingContext2D, tickDelta: number): void {
        const target = this.lockedTarget;
        if (!target || target.isRemoved()) {
            this.lockedTarget = null;
            return;
        }

        const stack = this.owner.getCurrentItem();
        const handItem = stack.getItem();
        if (!(handItem instanceof BaseWeapon)) return;

        const tPos = target.positionRef;
        const tVelocity = target.velocityRef;
        const oPos = this.owner.positionRef;
        const lx = lerp(tickDelta, target.prevX, tPos.x);
        const ly = lerp(tickDelta, target.prevY, tPos.y);

        const dx = lx - oPos.x;
        const dy = ly - oPos.y;
        const dist = Math.hypot(dx, dy);

        const bulletSpeed = handItem.getBallisticSpeed(stack);
        const t = bulletSpeed > 0 ? dist / bulletSpeed : 0;

        const leadX = lx + tVelocity.x * t;
        const leadY = ly + tVelocity.y * t;

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lx, ly, 15, 0, TAU);

        ctx.strokeStyle = 'yellow';
        ctx.moveTo(leadX - 5, leadY);
        ctx.lineTo(leadX + 5, leadY);
        ctx.moveTo(leadX, leadY - 5);
        ctx.lineTo(leadX, leadY + 5);
        ctx.stroke();
        ctx.lineWidth = 1;
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