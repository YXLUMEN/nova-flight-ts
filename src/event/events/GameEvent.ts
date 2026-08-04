export abstract class GameEvent {
    public readonly type: string;
    public readonly cancelable: boolean;

    private canceled: boolean = false;

    protected constructor(type: string, cancelable = false) {
        this.type = type;
        this.cancelable = cancelable;
    }

    public isCanceled() {
        return this.canceled;
    }

    public cancel() {
        if (this.cancelable) this.canceled = true;
    }
}