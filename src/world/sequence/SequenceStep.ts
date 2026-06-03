import type {SequenceContext} from "./SequenceContext.ts";

export type StepExecutor = (ctx: SequenceContext) => Promise<void> | void;

export class SequenceStep {
    public readonly name: string;
    public readonly execute: StepExecutor;

    public constructor(
        name: string,
        execute: StepExecutor,
    ) {
        this.name = name;
        this.execute = execute;
    }
}