import type {Entity} from "../../entity/Entity.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {doubleEquals, lerp, lerpRadians} from "../../utils/math/math.ts";

export class InterpolationHandler {
    private readonly entity: Entity;
    private readonly data = new InterpolationData(0, Vec2.ZERO, 0);

    private totalSteps: number = 0;
    private prevX: number | null = null;
    private prevY: number | null = null;
    private prevYaw: number | null = null;

    public constructor(entity: Entity, steps: number = 3) {
        this.entity = entity;
        this.totalSteps = steps;
    }

    public position(): Vec2 {
        return this.data.steps > 0 ? this.data.pos : this.entity.position();
    }

    public yaw(): number {
        return this.data.steps > 0 ? this.data.yaw : this.entity.getYaw();
    }

    public interpolateTo(pos: Vec2, yaw: number): void {
        if (this.totalSteps === 0) {
            this.entity.snapTo(pos.x, pos.y, yaw);
            this.cancel();
            return;
        }

        if (this.hasActivate() &&
            doubleEquals(this.yaw(), yaw) &&
            this.position().equals(pos)
        ) return;

        this.data.steps = this.totalSteps;
        this.data.pos = pos;
        this.data.yaw = yaw;

        this.prevX = this.entity.getX();
        this.prevY = this.entity.getY();
        this.prevYaw = this.entity.getYaw();
    }

    public interpolate() {
        if (!this.hasActivate()) {
            this.cancel();
            return;
        }

        const alpha = 1 / this.data.steps;
        if (this.prevX !== null && this.prevY !== null) {
            const last = this.entity.position().subtract(this.prevX, this.prevY);
            this.data.addDelta(last);
            // const delta = this.data.pos.addVec(last);
            // const box = this.entity.getDimensions().getBoxAtByVec(delta);
            //
            // if (this.entity.getWorld().noCollision(this.entity, box)) {
            //     this.data.addDelta(last);
            // }
        }

        if (this.prevYaw !== null) {
            const last = this.entity.getYaw() - this.prevYaw;
            this.data.yaw += last;
        }

        const x = lerp(alpha, this.entity.getX(), this.data.pos.x);
        const y = lerp(alpha, this.entity.getY(), this.data.pos.y);
        const yaw = lerpRadians(alpha, this.entity.getYaw(), this.data.yaw);
        this.entity.setPosition(x, y);
        this.entity.setYaw(yaw);

        this.data.steps--;
        this.prevX = x;
        this.prevY = y;
        this.prevYaw = yaw;
    }

    public hasActivate() {
        return this.data.steps > 0;
    }

    public setSteps(v: number) {
        this.totalSteps = Math.floor(v);
    }

    public cancel() {
        this.data.steps = 0;
        this.prevX = null;
        this.prevY = null;
        this.prevYaw = null;
    }
}

class InterpolationData {
    public steps: number;
    public pos: Vec2;
    public yaw: number;

    public constructor(steps: number, pos: Vec2, yaw: number) {
        this.steps = steps;
        this.pos = pos;
        this.yaw = yaw;
    }

    public addDelta(delta: Vec2) {
        this.pos = this.pos.addVec(delta);
    }
}