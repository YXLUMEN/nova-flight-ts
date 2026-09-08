import type {Consumer, Predicate} from "../../type/types.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {TranslatableText} from "../../i18n/TranslatableText.ts";
import type {Options} from "./Options.ts";
import {Result} from "../../utils/result/Result.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export class SettingItem<T> {
    public readonly id: Identifier;
    public readonly name: TranslatableText;

    public options: Options = null!;

    private readonly listeners = new Set<ChangeListener<T>>();
    protected readonly validate: Predicate<T>;
    protected readonly defaultValue: T;
    protected value: T;

    public constructor(
        id: Identifier,
        name: TranslatableText,
        defaultValue: T,
        validate: Predicate<T>,
    ) {
        if (!validate(defaultValue)) {
            throw new Error(`Default value "${defaultValue}" is invalidate`);
        }

        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.value = defaultValue;
        this.validate = validate;
    }

    public get(): T {
        return this.value;
    }

    public default(): T {
        return this.defaultValue;
    }

    /** 同步设置并通知所有订阅者 */
    public set(value: T): Result<T, Error> {
        if (value === this.value) {
            return Result.ok(this.value);
        }

        if (!this.validate(value)) {
            return Result.err(new IllegalArgumentError());
        }

        const prev = this.value;
        this.value = value;
        this.options.scheduleSave();
        this.announce(value, prev);
        return Result.ok(this.value);
    }

    public reset(): Result<T, Error> {
        return this.set(this.defaultValue);
    }

    /** 仅用于从配置文件加载 */
    public restore(value: T): void {
        if (value === this.value || !this.validate(value)) {
            return;
        }

        const prev = this.value;
        this.value = value;
        this.announce(value, prev);
    }

    public onChange(listener: ChangeListener<T>): Consumer<void> {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private announce(value: T, prev: T): void {
        for (const onChange of this.listeners) {
            try {
                onChange(value, prev);
            } catch (err) {
                console.error(err);
            }
        }
    }
}

type ChangeListener<T> = (value: T, previous: T) => void;
