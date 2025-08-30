export class EntityAttribute {
    private readonly fallback: number;
    private tracked: boolean = false;

    protected constructor(fallback: number) {
        this.fallback = fallback;
    }

    public getDefaultValue() {
        return this.fallback;
    }

    public isTracked(): boolean {
        return this.tracked;
    }

    public setTracked(tracked: boolean): EntityAttribute {
        this.tracked = tracked;
        return this;
    }

    public clamp(value: number) {
        return value;
    }
}
