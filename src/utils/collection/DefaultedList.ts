export class DefaultedList<E> implements ArrayLike<E>, Iterable<E> {
    private readonly delegate: E[];
    private readonly initialElement: E | null;

    public static of<E>(): DefaultedList<E> {
        return new DefaultedList<E>([], null);
    }

    public static ofSize<E>(size: number): DefaultedList<E> {
        return new DefaultedList<E>(new Array(size), null);
    }

    public static ofSizeAndValue<E>(size: number, defaultValue: E): DefaultedList<E> {
        if (defaultValue === null || defaultValue === undefined) {
            throw new Error('The validated object is null');
        }
        return new DefaultedList<E>(new Array(size).fill(defaultValue), defaultValue);
    }

    public static copyOf<E>(defaultValue: E, ...values: E[]): DefaultedList<E> {
        return new DefaultedList<E>(Array.from(values), defaultValue);
    }

    protected constructor(delegate: E[], initialElement: E | null) {
        this.delegate = delegate;
        this.initialElement = initialElement;
    }

    public get(index: number): E {
        return this.delegate[index];
    }

    public set(index: number, value: E): void {
        this.delegate[index] = value;
    }

    public add(index: number, value: E): void {
        this.delegate.splice(index, 0, value);
    }

    public remove(index: number): void {
        this.delegate.splice(index, 1);
    }

    public get length(): number {
        return this.delegate.length;
    }

    public clear(): void {
        if (this.initialElement === null) {
            this.delegate.length = 0;
        } else {
            this.delegate.fill(this.initialElement);
        }
    }

    [n: number]: E;

    * [Symbol.iterator](): IterableIterator<E> {
        for (let i = 0; i < this.delegate.length; i++) {
            const value = this.delegate[i];
            yield value === undefined && this.initialElement !== null
                ? this.initialElement
                : value;
        }
    }
}
