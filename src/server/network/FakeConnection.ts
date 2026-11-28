import type {UUID} from "../../type/types.ts";
import type {ProtocolInfo} from "../../network/protocol/ProtocolInfo.ts";
import type {PacketListener} from "../../network/PacketListener.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {SocketAddr} from "../../network/SocketAddr.ts";
import {Log} from "../../utils/Log.ts";
import {ConnectionState} from "../../network/ConnectionState.ts";

export class FakeConnection extends ServerConnection {
    public constructor(uuid: UUID) {
        super(SocketAddr.INTEGRATED, 0, uuid, false, null!);
    }

    public override tick() {
    }

    public override send() {
    }

    public override incoming() {
        throw new Error('fake channel never receive packet');
    }

    public override recv() {
        throw new Error('fake channel never receive packet');
    }

    public override report(err: unknown) {
        Log.error(err);
    }

    public override setInbound(protocol: ProtocolInfo, listener: PacketListener) {
        this.changeState(protocol.protocol);
        this.packetListener = listener;
    }

    public override setOutBound() {
    }

    public override disconnect() {
        this.changeState(ConnectionState.CLOSED);
        this.handlerDisconnection();
    }

    public override forceDisconnect() {
        this.changeState(ConnectionState.CLOSED);
        this.handlerDisconnection();
    }

    public override checkActivate() {
    }

    public override shouldRemove(): boolean {
        return this.isState(ConnectionState.CLOSED);
    }
}