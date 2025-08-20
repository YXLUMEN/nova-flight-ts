type PrimitiveToken = "int" | "unsigned int" | "float" | "string" | "boolean" | "any";
type ExtTypes = Record<string, unknown>;
type TokenString<Ext extends ExtTypes> = PrimitiveToken | `${PrimitiveToken}[]` | (keyof Ext & string) | `${keyof Ext & string}[]`;
type AnyArraySchema = readonly [];
type TupleSchema<T extends string> = readonly [T, ...readonly number[]];
type ObjectFieldSchema<Ext extends ExtTypes> = {
    type: Schema<Ext>;
    optional?: boolean;
    default?: unknown;
    defaultAs?: string;
};
type Schema<Ext extends ExtTypes = {}> = TokenString<Ext> | TupleSchema<TokenString<Ext>> | AnyArraySchema | ObjectFieldSchema<Ext> | {
    readonly [key: string]: Schema<Ext>;
};
type StripArray<T> = T extends `${infer U}[]` ? U : T;
type IsArrayToken<T> = T extends `${string}[]` ? true : false;
type BaseFromToken<T extends string, Ext extends ExtTypes> = T extends "int" | "unsigned int" | "float" ? number : T extends "string" ? string : T extends "boolean" ? boolean : T extends "any" ? unknown : T extends keyof Ext ? Ext[T] : unknown;
type FromToken<T extends string, Ext extends ExtTypes> = IsArrayToken<T> extends true ? Array<BaseFromToken<StripArray<T>, Ext>> : BaseFromToken<T, Ext>;
type OutputFromSchema<S, Ext extends ExtTypes = {}> = S extends readonly [] ? unknown[] : S extends `${string}[]` ? FromToken<S, Ext> : S extends string ? FromToken<S, Ext> : S extends readonly [infer TToken extends string, ...infer _R extends readonly number[]] ? FromToken<TToken, Ext> : S extends object ? {
    readonly [K in keyof S]: OutputFromSchema<S[K], Ext>;
} : unknown;
type Path = readonly (string | number)[];
type Validator<T> = (value: unknown, path: Path) => T;
type RegistryEntry<T> = {
    base: Validator<T>;
};

declare class ValidationError extends Error {
    readonly path: Path;
    constructor(path: Path, message: string);
}

declare const isArraySchema: (s: Schema<any>) => s is AnyArraySchema;
declare const isTupleSchema: (s: Schema<any>) => s is TupleSchema<string>;
declare const isTokenString: (s: Schema<any>) => s is string;
declare const isObjectSchema: (s: Schema<any>) => s is {
    readonly [k: string]: Schema<any>;
};
declare function isObjectFieldSchema<Ext extends ExtTypes>(s: Schema<Ext>): s is ObjectFieldSchema<Ext>;

declare class TypeRegistry {
    private readonly map;
    constructor();
    addType<K extends string, T>(name: K, base: Validator<T>): void;
    get(name: string): RegistryEntry<unknown> | undefined;
}

declare const makeValidatorFromToken: (registry: TypeRegistry, token: string) => Validator<unknown>;
declare const applyTupleConstraints: (token: string, value: unknown, path: Path, args: readonly unknown[]) => unknown;

declare class ConfigLoader<S extends Schema<Ext>, Ext extends ExtTypes = {}> {
    private readonly schema;
    private readonly registry;
    constructor(schema: S, setup?: (r: TypeRegistry) => void);
    load(data: unknown): OutputFromSchema<S, Ext>;
    addType<K extends string, T>(name: K, base: Validator<T>): void;
    private validate;
}

export { type AnyArraySchema, ConfigLoader, type ExtTypes, type ObjectFieldSchema, type OutputFromSchema, type Path, type Schema, type TokenString, type TupleSchema, ValidationError, applyTupleConstraints, isArraySchema, isObjectFieldSchema, isObjectSchema, isTokenString, isTupleSchema, makeValidatorFromToken };
