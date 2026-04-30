import type {Payload} from "../../network/Payload.ts";
import type {BiConsumer} from "../../type/types.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {ServerIntegratedChannel} from "./ServerIntegratedChannel.ts";

export class CombineServerChannel implements ServerChannel {
    public readonly network: ServerNetworkChannel;
    public readonly integrated: ServerIntegratedChannel;

    public constructor(networkChannel: ServerNetworkChannel, integratedChannel: ServerIntegratedChannel) {
        this.network = networkChannel;
        this.integrated = integratedChannel;
    }

    public getSessionId(): number {
        return this.network.getSessionId();
    }

    public setServerAddress(address: string): void {
        this.network.setServerAddress(address);
    }

    public action(buf: Uint8Array<ArrayBuffer>): void {
        this.network.action(buf);
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile): void {
        this.network.sendTo(payload, target);
        this.integrated.sendTo(payload, target);
    }

    public sendToId<T extends Payload>(payload: T, target: number): void {
        this.network.sendToId(payload, target);
        this.integrated.sendToId(payload, target);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
        this.network.sendExclude(payload, ...excludes);
        this.integrated.sendExclude(payload, ...excludes);
    }

    public setHandler(handler: BiConsumer<number, Payload>): void {
        this.network.setHandler(handler);
        this.integrated.setHandler(handler);
    }

    public clearHandlers(): void {
        this.network.clearHandlers();
        this.integrated.clearHandlers();
    }

    public async connect(): Promise<void> {
        await this.network.connect();
        await this.integrated.connect();
    }

    public disconnect(): void {
        this.network.disconnect();
        this.integrated.disconnect();
    }

    public sniff(): Promise<boolean> {
        return this.integrated.sniff();
    }

    public send<T extends Payload>(payload: T): void {
        this.network.send(payload);
        this.integrated.send(payload);
    }

    public isOpen(): boolean {
        return this.network.isOpen() && this.integrated.isOpen();
    }
}