import type {Channel} from "./Channel.ts";

export class FakeChannel implements Channel {
    public static readonly INSTANCE = new FakeChannel();

    private constructor() {
    }

    public getSid(): number {
        return 0;
    }

    public setHandler(): void {
    }

    public inbound(): void {
        throw new Error('channel not active');
    }

    public outbound(): void {
        throw new Error('channel not active');
    }

    public send(): void {
        throw new Error('channel not active');
    }

    public feed(): void {
        throw new Error('channel not active');
    }

    public close(): void {
    }
}