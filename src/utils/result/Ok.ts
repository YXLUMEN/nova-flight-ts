export class Ok<T> {
    public readonly value: T;
    public readonly ok = true;

    public constructor(value: T) {
        this.value = value;
    }
}

export function ok<T>(value: T) {
    return new Ok(value);
}