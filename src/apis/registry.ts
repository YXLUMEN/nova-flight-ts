import type {PhaseConfig, SpawnRuleConfig} from "./IStage.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";

export interface SpawnRuleConfigJSON extends Omit<SpawnRuleConfig, 'factory'> {
    factory: [string, ...any[]]; // [函数名, 参数...]
}

export interface PhaseConfigJSON extends Omit<PhaseConfig, 'rules'> {
    rules: SpawnRuleConfigJSON[];
}

export type Constructor<T = any> = new (...args: any[]) => T;

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type Consumer<T> = (val: T) => void;

export type AsyncConsumer<T> = (val: T) => Promise<void>;

export type UnaryOperator<T> = (val: T) => T;

export type Field<C, F> = [PacketCodec<F>, (c: C) => F];