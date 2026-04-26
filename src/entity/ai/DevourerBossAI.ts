import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {EntityAi} from "./EntityAi.ts";

export enum DevourerPhase {
    PHASE_1,
    PHASE_2,
    STAGE_TRANSITION,
    PHASE_3,
}

export interface MoveIntent {
    targetYaw: number;
    speed: number;
}

export class DevourerBossAI implements EntityAi {
    private disabled = false;

    private sinOffset: number = 0;
    private sinAmplitude: number = 80;

    public readonly targetPos: MutVec2 = MutVec2.zero();


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

    public tick(): void {
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
        return nbt;
    }

    public readNBT(): void {
    }
}
