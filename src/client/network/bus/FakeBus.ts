import type {ClientBus} from "./ClientBus.ts";

export class FakeBus implements ClientBus {
    public static readonly INSTANCE = new FakeBus();

    private constructor() {
    }

    public setChannel(): void {
    }

    public sendBuffer(): void {
        throw new Error('channel not active');
    }

    public isConnected(): boolean {
        return false;
    }

    public getSessionId(): number {
        return 0;
    }

    public connect(): Promise<void> {
        return Promise.resolve();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public disconnect(): void {
    }
}