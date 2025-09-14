import {SpawnRule} from "./SpawnRule.ts";
import type {PhaseConfig, RNG, SpawnCtx} from "../apis/IStage.ts";
import type {World} from "../world/World.ts";

export class Stage {
    private readonly rng: RNG;
    private readonly phases: PhaseConfig[];

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
        this.loadPhase(0);
    }

    public tick(world: World) {
        if (this.index >= this.phases.length) return;

        this.ticks++;
        this.phaseTime++;

        const ctx: SpawnCtx = {
            world,
            time: this.ticks,
            phaseTime: this.phaseTime,
            phaseIndex: this.index,
            score: world.player?.getPhaseScore() ?? 0,
            rng: this.rng,
            difficulty: this.computeDifficulty(),
        };

        const phase = this.phases[this.index];

        if (this.phaseTime === 1 && phase.onEnter) {
            phase.onEnter(ctx);
        }

        for (const r of this.rules) {
            r.tick(ctx);
        }

        const timeUp = phase.duration !== undefined && this.phaseTime >= phase.duration;
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

    public nextPhase() {
        const index = this.index + 1;
        if (index >= this.phases.length) return;
        this.loadPhase(index);
    }

    private loadPhase(index: number) {
        this.index = index;
        this.phaseTime = 0;

        this.rules = this.phases[index].rules.map(r => new SpawnRule(r));
        for (const r of this.rules) r.reset();
    }

    private computeDifficulty(): number {
        return 1; // 占位
    }
}