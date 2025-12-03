export class Err<E> {
    public readonly error: E;
    public readonly ok = false;

    public constructor(error: E) {
        this.error = error;
    }
}

export function err<E>(error: E) {
    return new Err(error);
}