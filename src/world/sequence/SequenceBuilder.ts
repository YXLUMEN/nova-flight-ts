import {SequenceStep, type StepExecutor} from "./SequenceStep.ts";
import type {SequenceContext} from "./SequenceContext.ts";
import type {Predicate, Return} from "../../type/types.ts";

export class SequenceBuilder {
    private readonly name: string;
    private readonly steps: SequenceStep[] = [];
    private keep = false;

    public constructor(name: string) {
        this.name = name;
    }

    public wait(ms: number): this {
        this.steps.push(new SequenceStep(
            `wait_${ms}`,
            async ctx => {
                await ctx.wait(ms);
            }
        ));
        return this;
    }

    public say(key: string): this {
        this.steps.push(new SequenceStep(
            `say_${key}`,
            ctx => {
                if (ctx.cancelToken.isCancelled()) return;
                ctx.say(key);
            }
        ));
        return this;
    }

    public saySequence(keys: string[], delayMs: number): this {
        this.steps.push(new SequenceStep(
            `say_sequence_${keys.length}`,
            async (ctx) => {
                for (const key of keys) {
                    const ok = await ctx.wait(delayMs);
                    if (!ok) return;
                    ctx.say(key);
                }
            },
        ));
        return this;
    }

    public waitResolve(
        name: string,
        factory: Return<SequenceContext, Promise<void>>,
    ): this {
        this.steps.push(new SequenceStep(
            `promise_${name}`,
            async (ctx) => {
                const promise = factory(ctx);
                await Promise.race([
                    ctx.cancelToken.wait(),
                    promise
                ]);
            },
        ));
        return this;
    }

    public waitCondition(
        name: string,
        predicate: Predicate<SequenceContext>,
        tickMs: number = 50,
    ): this {
        this.steps.push(new SequenceStep(
            `condition_${name}`,
            async (ctx) => {
                while (!predicate(ctx)) {
                    const ok = await ctx.wait(tickMs);
                    if (!ok) return;
                }
            },
        ));
        return this;
    }

    public accumulate(
        conditionName: string,
        predicate: Predicate<SequenceContext>,
        requiredMs: number,
        pollMs: number = 50,
    ): this {
        this.steps.push(new SequenceStep(
            `accumulate(${conditionName}, ${requiredMs}ms)`,
            async (ctx) => {
                let accumulated = 0;
                let lastTime = performance.now();

                while (accumulated < requiredMs) {
                    const ok = await ctx.wait(pollMs);
                    if (!ok) return;

                    const now = performance.now();
                    const delta = now - lastTime;

                    if (predicate(ctx)) {
                        accumulated += delta;
                    }
                    lastTime = now;
                }
            },
        ));
        return this;
    }

    public callback(name: string, callback: StepExecutor): this {
        this.steps.push(new SequenceStep(
            `callback_${name}`,
            async (ctx) => {
                if (ctx.cancelToken.isCancelled()) return;
                await callback(ctx);
            },
        ));
        return this;
    }

    public keepCtx(): this {
        this.keep = true;
        return this;
    }

    public build(): SequenceDef {
        return {
            name: this.name,
            keepCtx: this.keep,
            steps: this.steps,
        };
    }
}

export interface SequenceDef {
    readonly name: string;
    readonly keepCtx: boolean;
    readonly steps: SequenceStep[];
}