import type {Consumer, Predicate} from "../../type/types.ts";
import type {SpawnContext} from "./SpawnContext.ts";
import type {SpawnRuleConfig} from "./SpawnRuleConfig.ts";
import {empty, none} from "../../utils/util.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export interface PhaseConfig {
    readonly name: string;
    readonly rules: readonly SpawnRuleConfig[];
    readonly ticks: number; // 持续时间. tick
    readonly until: Predicate<SpawnContext>; // 自定义结束条件
    readonly onEnter: Consumer<SpawnContext>;
    readonly onExit: Consumer<SpawnContext>;
}

export function createPhase(name: string): PhaseBuilder {
    return new PhaseBuilder(name);
}

class PhaseBuilder {
    private readonly name: string;
    private configs: SpawnRuleConfig[] | null = null;
    private ticks_: number = Infinity;
    private until_: Predicate<SpawnContext> = none;
    private onEnter_: Consumer<SpawnContext> = empty;
    private onExit_: Consumer<SpawnContext> = empty;

    public constructor(name: string) {
        this.name = name;
    }

    public rules(...configs: SpawnRuleConfig[]) {
        this.configs = configs;
        return this;
    }

    public ticks(v: number) {
        if (!Number.isSafeInteger(v) || v < 0) {
            throw new IllegalArgumentError('Ticks must be a positive int');
        }
        this.ticks_ = v;
        return this;
    }

    public until(fn: Predicate<SpawnContext>) {
        this.until_ = fn;
        return this;
    }

    public onEnter(fn: Consumer<SpawnContext>) {
        this.onEnter_ = fn;
        return this;
    }

    public onExit(fn: Consumer<SpawnContext>) {
        this.onExit_ = fn;
        return this;
    }

    public build(): PhaseConfig {
        return Object.freeze<PhaseConfig>({
            name: this.name,
            rules: this.configs ?? [],
            ticks: this.ticks_,
            until: this.until_,
            onEnter: this.onEnter_,
            onExit: this.onExit_,
        });
    }
}