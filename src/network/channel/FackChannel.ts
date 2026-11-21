import type {Channel} from "./Channel.ts";

export class FakeChannel implements Channel {
    public static readonly INSTANCE = new FakeChannel();

    private constructor() {
    }

    public isOpen(): boolean {
        return false;
    }

    public getSessionId(): number {
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

    public broadcast(): void {
        throw new Error('channel not active');
    }

    public unicast(): void {
        throw new Error('channel not active');
    }

    public onMessage(): void {
    }

    public disconnect(): void {
    }
}