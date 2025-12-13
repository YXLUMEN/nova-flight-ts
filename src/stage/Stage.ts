import {SpawnRule} from "./SpawnRule.ts";
import type {RNG} from "../apis/IStage.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import {type NbtCompound} from "../nbt/NbtCompound.ts";
import {clamp} from "../utils/math/math.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {PhaseConfig} from "./PhaseConfig.ts";
import type {SpawnContext} from "./SpawnContext.ts";

export class Stage implements NbtSerializable {
    private readonly rng: RNG;
    private readonly phases: PhaseConfig[];

    private paused = false;
    private ticks = 0;
    private phaseTime = 0;
    private index = 0;
    private rules: SpawnRule[] = [];

    public constructor(phases: PhaseConfig[], rng?: RNG) {
        this.phases = phases;
        this.rng = rng ?? Math.random;
        this.loadPhase(0);
    }

    public getCurrentName(): string | null {
        return this.index < this.phases.length ? this.phases[this.index].name : null;
    }

    public reset() {
        this.ticks = 0;
        this.phaseTime = 0;
        this.index = 0;
        this.paused = false;
        this.loadPhase(0);
    }

    public pause(): void {
        this.paused = true;
    }

    public resume(): void {
        this.paused = false;
    }

    public tick(world: ServerWorld) {
        if (this.index >= this.phases.length) return;
        if (this.paused) return;

        this.ticks++;
        this.phaseTime++;

        const ctx: SpawnContext = {
            world,
            time: this.ticks,
            phaseTime: this.phaseTime,
            phaseIndex: this.index,
            score: world.getPhase(),
            rng: this.rng,
            difficulty: world.stageDifficulty,
        };

        const phase = this.phases[this.index];

        if (this.phaseTime === 1 && phase.onEnter) {
            phase.onEnter(ctx);
        }

        for (const r of this.rules) r.tick(ctx);

        const timeUp = phase.ticks !== undefined && this.phaseTime >= phase.ticks;
        const until = phase.until ? phase.until(ctx) : false;

        if (timeUp || until) {
            if (phase.onExit) phase.onExit(ctx);
            if (this.index + 1 < this.phases.length) {
                this.loadPhase(this.index + 1);
            } else {
                this.index = this.phases.length; // 结束
            }
        }
    }

    public nextPhase(): boolean {
        const index = this.index + 1;
        if (index >= this.phases.length) return false;
        this.loadPhase(index);
        return true;
    }

    public setStage(name: string): boolean {
        this.reset();
        while (true) {
            const current = this.getCurrentName();
            if (current === name) return true;
            if (!this.nextPhase()) return false;
        }
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        return nbt.putInt8('StageIndex', this.index);
    }

    public readNBT(nbt: NbtCompound) {
        const index = clamp(nbt.getInt8('StageIndex'), 0, this.phases.length);
        this.loadPhase(index);
    }

    private loadPhase(index: number) {
        this.index = index;
        this.phaseTime = 0;

        this.rules = this.phases[index].rules.map(r => new SpawnRule(r));
        for (const r of this.rules) r.reset();
    }
}