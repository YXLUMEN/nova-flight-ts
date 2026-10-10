import type {ClientChannel} from "./ClientChannel.ts";

export class FakeChannel implements ClientChannel {
    public static readonly INSTANCE = new FakeChannel();

    private constructor() {
    }

    public clearHandlers(): void {
    }

    public connect(): Promise<void> {
        return Promise.resolve();
    }

    public disconnect(): void {
    }

    public getSessionId(): number {
        return 0;
    }

    public isConnected(): boolean {
        return false;
    }

    public send(): void {
    }

    public setHandler(): void {
    }

    public setRemote(): void {
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(false);
    }
}