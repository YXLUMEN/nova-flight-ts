import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import {KeepAliveC2SPacket} from "../../network/packet/c2s/KeepAliveC2SPacket.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../apis/types.ts";
import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";

export abstract class ServerCommonNetworkHandler {
    protected static readonly TIMEOUT = 'disconnect.timeout';

    protected readonly server: NovaFlightServer;
    protected readonly channel: ServerNetworkChannel;

    private lastKeepAliveTime: number;
    private waitingForKeepAlive: boolean = true;
    private keepAliveId: number = 0;
    private transitionStartTime: number = 0;
    private transitioning = false;

    private readonly payloadHandlers = new HashMap<Identifier, Consumer<Payload>>();

    protected constructor(server: NovaFlightServer, channel: ServerNetworkChannel) {
        this.server = server;
        this.channel = channel;
        this.lastKeepAliveTime = performance.now();
    }

    public onDisconnected(): void {
        if (this.isHost()) {
            this.server.stopGame().catch(console.error);
        }
    }

    public onKeepAlive(packet: KeepAliveC2SPacket): void {
        if (this.waitingForKeepAlive && packet.id === this.keepAliveId) {
            this.waitingForKeepAlive = false;
            return;
        }
        if (!this.isHost()) {
            this.disconnect(ServerCommonNetworkHandler.TIMEOUT);
        }
    }

    protected baseTick(): void {
        const now = performance.now();
        if (this.isHost() || now - this.lastKeepAliveTime < 15000) return;

        if (this.waitingForKeepAlive) {
            this.disconnect(ServerCommonNetworkHandler.TIMEOUT);
            return;
        }

        if (this.checkTransitionTimeout(now)) {
            this.waitingForKeepAlive = true;
            this.lastKeepAliveTime = now;
            this.keepAliveId = now;
            this.send(new KeepAliveC2SPacket(this.keepAliveId));
        }
    }

    private checkTransitionTimeout(time: number): boolean {
        if (!this.transitioning) {
            return true;
        }

        if (time - this.transitionStartTime >= 15000) {
            this.disconnect(ServerCommonNetworkHandler.TIMEOUT);
        }
        return false;
    }

    public send(packet: Payload): void {
        this.channel.sendTo(packet, this.getProfile());
    }

    public disconnect(reason: string): void {
        const profile = this.getProfile();
        this.channel.sendTo(new PlayerDisconnectS2CPacket(profile.clientId, reason), profile);
    }

    protected isHost() {
        return this.server.isHost(this.getProfile());
    }

    public register<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.payloadHandlers.set(id.id, handler as Consumer<Payload>);
    }

    public handlePayload(packet: Payload): void {
        this.payloadHandlers.get(packet.getId().id)?.(packet);
    }

    protected abstract getProfile(): GameProfile;
}