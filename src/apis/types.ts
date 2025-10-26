import type {PhaseConfig, SpawnRuleConfig} from "./IStage.ts";

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

export type Supplier<T> = () => T;

export type Predicate<T> = (val: T) => boolean;

export interface Comparable {
    equals(other: Comparable): boolean;

    hashCode(): string;
}

export interface StoreConfig {
    name: string; // 对象存储名称
    keyPath: string; // 主键字段名
    autoIncrement?: boolean; // 是否启用主键自增
    indexes?: {
        name: string;       // 索引名称
        keyPath: string | string[];    // 索引字段路径
        unique?: boolean;   // 是否唯一索引
    }[];
}