import type {PacketListener} from "../../../network/handler/PacketListener.ts";
import {ConnectionState} from "../ConnectionState.ts";
import type {RelayMessage} from "../../../network/packet/relay/RelayMessage.ts";
import type {Detached} from "../../../network/packet/relay/Detached.ts";
import type {ClientAttached} from "../../../network/packet/relay/ClientAttached.ts";
import type {ServerNetworkManager} from "../ServerNetworkManager.ts";

export class ServerRelayHandler implements PacketListener {
    private readonly manager: ServerNetworkManager;

    public constructor(manager: ServerNetworkManager) {
        this.manager = manager;
    }

    public onRelayMessage(packet: RelayMessage) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');
        console.log(type, msg);
    }

    public onDetached(packet: Detached) {
        const conn = this.manager.getConnection(packet.sessionId);
        if (conn) this.manager.removeConnection(conn);
    }

    public onClientAttached(packet: ClientAttached) {
        const id = packet.sessionId;
        const conn = this.manager.getConnection(id);
        if (conn) this.manager.removeConnection(conn);

        this.manager.permit(id);
    }

    public onDisconnected(): void {
    }

    public accept(): void {
    }

    public getPhase(): ConnectionState {
        return ConnectionState.HANDSHAKING;
    }

    public tick() {
    }

    public clear(): void {
    }
}