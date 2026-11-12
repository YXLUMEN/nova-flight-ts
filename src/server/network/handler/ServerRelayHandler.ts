import type {PacketListener} from "../../../network/handler/PacketListener.ts";
import type {RelayMessage} from "../../../network/packet/relay/RelayMessage.ts";
import type {Detached} from "../../../network/packet/relay/Detached.ts";
import type {ClientAttached} from "../../../network/packet/relay/ClientAttached.ts";
import type {ServerNetworkManager} from "../ServerNetworkManager.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {RelayCodeMap} from "../../../network/RelayCodeMap.ts";

export class ServerRelayHandler implements PacketListener {
    private readonly manager: ServerNetworkManager;

    public constructor(manager: ServerNetworkManager) {
        this.manager = manager;
    }

    public onRelayMessage(packet: RelayMessage) {
        const key = RelayCodeMap.get(packet.code);
        console.log(key, packet.args);
    }

    public onDetached(packet: Detached) {
        const sid = packet.sessionId;
        const conn = this.manager.getConnection(sid);
        if (conn) this.manager.removeConnection(conn);

        this.manager.detached(sid);
    }

    public onClientAttached(packet: ClientAttached) {
        const sid = packet.sessionId;
        // 清理过时连接
        const conn = this.manager.getConnection(sid);
        if (conn) this.manager.removeConnection(conn);

        this.manager.permit(sid, packet.addr);
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