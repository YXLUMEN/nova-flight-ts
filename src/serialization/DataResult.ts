import type {Consumer, Return, Supplier} from "../type/types.ts";
import {Optional} from "../utils/Optional.ts";

export abstract class DataResult<R> {
    public static ok<R>(result: R): DataResult<R> {
        return new SuccessResult(result);
    }

    public static err<R>(message: Supplier<string> | string, partial?: R): DataResult<R> {
        return new ErrorResult(
            typeof message === 'function' ? message : () => message,
            Optional.ofNullable(partial)
        );
    }

    public static partialGet<K, V>(get: Return<K, V>, errorPrefix: Supplier<string>): Return<K, DataResult<V>> {
        return (name: K) => Optional.ofNullable(get(name))
            .map(this.ok)
            .orElseGet(() => this.err(() => errorPrefix() + name));
    }

    public abstract unwrap(): R;

    public abstract result(): Optional<R>;

    public abstract error(): Optional<ErrorResult<R>>;

    public abstract hasFullResult(): boolean;

    public abstract resultOrPartial(onErr?: Consumer<string>): Optional<R>;

    public abstract setPartial(partial: R): DataResult<R>;

    public abstract isOk(): boolean;

    public map<B>(fn: Return<R, B>): DataResult<B> {
        const result = this.result();
        if (result.isPresent()) {
            return DataResult.ok(fn(result.get()));
        }

        const err = this.error().get();
        return new ErrorResult(err.message, err.partial.map(fn));
    }

    public flatMap<B>(fn: Return<R, DataResult<B>>): DataResult<B> {
        const result = this.result();
        if (result.isPresent()) {
            return fn(result.get());
        }

        const err = this.error().get();
        const partial = err.partial.map(value => fn(value).result()).orElse(Optional.empty());
        return new ErrorResult(err.message, partial);
    }

    public orElse(defaultValue: R): R {
        return this.result().orElse(defaultValue);
    }

    public getOrNull(): R | null {
        const result = this.result();
        return result.isPresent() ? result.get() : null;
    }
}

export class SuccessResult<R> extends DataResult<R> {
    public readonly value: R;

    public constructor(value: R) {
        super();
        this.value = value;
    }

    public override unwrap(): R {
        return this.value;
    }

    public override result(): Optional<R> {
        return Optional.of(this.value);
    }

    public override error(): Optional<ErrorResult<R>> {
        return Optional.empty();
    }

    public override hasFullResult(): boolean {
        return true;
    }

    public override resultOrPartial(): Optional<R> {
        return Optional.of(this.value);
    }

    public override setPartial(): DataResult<R> {
        return this;
    }

    public override isOk(): boolean {
        return true;
    }
}

export class ErrorResult<R> extends DataResult<R> {
    public readonly message: Supplier<string>;
    public readonly partial: Optional<R>;

    public constructor(message: Supplier<string>, partial: Optional<R>) {
        super();
        this.message = message;
        this.partial = partial;
    }

    public override unwrap(): R {
        throw this.message();
    }

    public override result(): Optional<R> {
        return Optional.empty();
    }

    public override error(): Optional<ErrorResult<R>> {
        return Optional.of(this);
    }

    public override hasFullResult(): boolean {
        return this.partial.isPresent();
    }

    public override resultOrPartial(onErr?: Consumer<string>): Optional<R> {
        onErr?.(this.message());
        return this.partial;
    }

    public override setPartial(partial: R): DataResult<R> {
        return new ErrorResult(this.message, Optional.of(partial));
    }

    public override isOk(): boolean {
        return false;
    }
}