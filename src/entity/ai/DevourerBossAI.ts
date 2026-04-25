import {MutVec2} from "../../utils/math/MutVec2.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {lerp} from "../../utils/math/math.ts";

export enum DevourerPhase {
    PHASE_1,
    PHASE_2,
    STAGE_TRANSITION,
    PHASE_3,
}

export enum DevourerBehavior {
    IDLE,
    CHASE,
    CHARGE,
    RETREAT,
    STRAFE,
}

export interface MoveIntent {
    targetYaw: number;
    speed: number;
}

export class DevourerBossAI {
    private behavior: DevourerBehavior = DevourerBehavior.IDLE;

    private sinOffset: number = 0;
    private sinAmplitude: number = 80;

    private chargeLeft: number = 0;
    private readonly chargeTarget: MutVec2 = MutVec2.zero();
    private readonly chargeDir: MutVec2 = MutVec2.zero();

    private readonly retreatDir: MutVec2 = MutVec2.zero();
    public readonly targetPos: MutVec2 = MutVec2.zero();

    public computeIntent(
        pos: Vec2,
        target: Vec2 | null,
        phase: DevourerPhase,
        age: number,
        baseSpeed: number
    ): MoveIntent {
        if (this.behavior === DevourerBehavior.CHARGE) {
            return this.tickChargeIntent(pos, baseSpeed, phase);
        }

        if (!target) {
            return this.wanderIntent(age, baseSpeed);
        }

        this.targetPos.set(target.x, target.y);

        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);

        switch (this.behavior) {
            case DevourerBehavior.STRAFE:
                return this.strafeIntent(pos, target, age, baseSpeed, phase);
            case DevourerBehavior.RETREAT:
                return this.retreatIntent(age, baseSpeed);
            default:
                return this.chaseIntent(dx, dy, dist, age, baseSpeed, phase);
        }
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

        return {targetYaw: Math.atan2(vy, vx), speed: Math.hypot(vx, vy)};
    }

    private strafeIntent(
        pos: Vec2, target: Vec2,
        age: number,
        speed: number,
        phase: DevourerPhase
    ): MoveIntent {
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.001) return {targetYaw: 0, speed: 0};

        const circleAngle = age * (phase === DevourerPhase.PHASE_3 ? 0.05 : 0.03);
        const r = 320;
        const cx = target.x + Math.cos(circleAngle) * r;
        const cy = target.y + Math.sin(circleAngle) * r;

        const tdx = cx - pos.x;
        const tdy = cy - pos.y;
        const td = Math.hypot(tdx, tdy);
        if (td < 0.001) return {targetYaw: 0, speed: 0};

        return {targetYaw: Math.atan2(tdy, tdx), speed};
    }

    private wanderIntent(age: number, speed: number): MoveIntent {
        return {targetYaw: age * 0.02, speed: speed * 0.5};
    }

    private retreatIntent(age: number, speed: number): MoveIntent {
        const wobble = Math.sin(age * 0.15) * 0.3;
        const vx = this.retreatDir.x * speed + wobble;
        const vy = this.retreatDir.y * speed + wobble;
        return {targetYaw: Math.atan2(vy, vx), speed: Math.hypot(vx, vy)};
    }

    private tickChargeIntent(pos: Vec2, speed: number, phase: DevourerPhase): MoveIntent {
        if (this.chargeLeft-- <= 0) {
            this.behavior = DevourerBehavior.CHASE;
            return {targetYaw: Math.atan2(this.chargeDir.y, this.chargeDir.x), speed: 0};
        }

        const chargeSpeed = phase === DevourerPhase.PHASE_3 ? speed * 5.5 :
            phase === DevourerPhase.PHASE_2 ? speed * 4.0 : speed * 3.0;

        const tx = this.chargeTarget.x - pos.x;
        const ty = this.chargeTarget.y - pos.y;
        const d = Math.hypot(tx, ty);
        const corrX = d > 0.001 ? tx / d : this.chargeDir.x;
        const corrY = d > 0.001 ? ty / d : this.chargeDir.y;

        const blendFactor = 0.2;
        const finalX = lerp(blendFactor, this.chargeDir.x, corrX);
        const finalY = lerp(blendFactor, this.chargeDir.y, corrY);

        return {targetYaw: Math.atan2(finalY, finalX), speed: chargeSpeed};
    }

    public setBehavior(behavior: DevourerBehavior): void {
        this.behavior = behavior;
    }
}
