import {Optional} from "../Optional.ts";

export interface DataResult<T> {
    result(): Optional<T>;

    error(): Optional<Error>;
}

export class Success<T> implements DataResult<T> {
    public readonly data: T;

    public constructor(data: T) {
        this.data = data;
    }

    public result(): Optional<T> {
        return Optional.of(this.data);
    }

    public error(): Optional<Error> {
        return Optional.empty();
    }
}

export class Failure<T> implements DataResult<T> {
    private readonly err: Error;

    public constructor(error: Error) {
        this.err = error;
    }

    public result(): Optional<T> {
        return Optional.empty();
    }

    public error(): Optional<Error> {
        return Optional.of(this.err);
    }
}