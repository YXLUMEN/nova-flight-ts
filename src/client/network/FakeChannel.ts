import type {ClientChannel} from "./ClientChannel.ts";

export class FakeChannel implements ClientChannel {
    public static readonly INSTANCE = new FakeChannel();

    private constructor() {
    }

    public isOpen(): boolean {
        return false;
    }

    public isConnected(): boolean {
        return false;
    }

    public getSessionId(): number {
        return 0;
    }

    public clearHandler(): void {
    }

    public connect(): Promise<void> {
        return Promise.resolve();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(false);
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