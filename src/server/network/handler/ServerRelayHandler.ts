import type {PacketListener} from "../../../network/PacketListener.ts";
import type {RelayMessage} from "../../../network/packet/relay/RelayMessage.ts";
import type {Detached} from "../../../network/packet/relay/Detached.ts";
import type {ClientAttached} from "../../../network/packet/relay/ClientAttached.ts";
import type {ServerNetworkManager} from "../ServerNetworkManager.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {PacketCodec} from "../../../network/codec/PacketCodec.ts";
import type {RelayPayload} from "../../../network/RelayPayload.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {RelayCodeMap} from "../../../network/RelayCodeMap.ts";
import {NetworkSide} from "../../../network/NetworkSide.ts";
import {RelayProtocols} from "../../../network/protocol/RelayProtocols.ts";
import {Log} from "../../../utils/Log.ts";

export class ServerRelayHandler implements PacketListener {
    private readonly manager: ServerNetworkManager;
    private readonly codec: PacketCodec<RelayPayload>;

    public constructor(manager: ServerNetworkManager) {
        this.manager = manager;
        this.codec = RelayProtocols.RELAY.codec;
    }

    public onMessage(reader: BinaryReader) {
        try {
            this.codec.decode(reader).accept(this);
        } catch (err) {
            Log.error(err);
        }
    }

    public onDetached(packet: Detached) {
        this.manager.detach(packet.sessionId);
    }

    public onClientAttached(packet: ClientAttached) {
        this.manager.permit(packet.sessionId, packet.addr);
    }

    public onRelayMessage(packet: RelayMessage) {
        const key = RelayCodeMap.get(packet.code);
        console.log(key, packet.args);
    }

    public getPhase(): ConnectionState {
        return ConnectionState.HANDSHAKING;
    }

    public side(): NetworkSide {
        return NetworkSide.SERVER;
    }

    public onDisconnected(): void {
    }

    public accept(): void {
    }

    public tick() {
    }

    public clear(): void {
    }
}