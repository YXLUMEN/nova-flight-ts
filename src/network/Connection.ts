import type {Channel} from "./channel/Channel.ts";
import type {SocketAddr} from "./SocketAddr.ts";
import type {PacketListener} from "./PacketListener.ts";
import type {Payload} from "./Payload.ts";
import type {ProtocolInfo} from "./protocol/ProtocolInfo.ts";
import type {ChannelHandler} from "./channel/ChannelHandler.ts";
import {NetworkSide} from "./NetworkSide.ts";
import {ConnectionState} from "./ConnectionState.ts";
import {FakeChannel} from "./channel/FakeChannel.ts";

export abstract class Connection implements ChannelHandler {
    public address: SocketAddr;
    public readonly receiving: NetworkSide;
    public readonly sending: NetworkSide;

    protected channel: Channel = FakeChannel.INSTANCE;
    protected packetListener: PacketListener | null = null;
    protected disconnectListener: PacketListener | null = null;
    protected state: ConnectionState = ConnectionState.HANDSHAKING;

    protected constructor(side: NetworkSide, addr: SocketAddr) {
        this.address = addr;
        this.sending = side;
        this.receiving = side === NetworkSide.CLIENT ? NetworkSide.SERVER : NetworkSide.CLIENT;
    }

    public channelActive(channel: Channel) {
        this.channel = channel;
        channel.setHandler(this);
    }

    public abstract recv(payload: Payload): void;

    public abstract report(err: unknown): void;

    public setInbound(protocol: ProtocolInfo, listener: PacketListener) {
        if (!listener) throw new Error('PacketListener is null');
        if (protocol.side !== this.receiving) {
            throw new Error(`Trying to set listener for wrong side, connection need "${this.receiving}", but is "${protocol.side}"`);
        }
        if (listener.getPhase() !== protocol.protocol) {
            throw new Error(`Listener protocol "${listener.getPhase()}" does not match requested one "${protocol.protocol}"`);
        }
        this.changeState(protocol.protocol);
        this.packetListener = listener;
        this.channel.inbound(protocol);
    }

    public setOutBound(protocol: ProtocolInfo) {
        if (protocol.side !== this.sending) {
            throw new Error(`Invalid outbound protocol: "${protocol.protocol}"`);
        }
        this.channel.outbound(protocol);
    }

    public changeState(state: ConnectionState): boolean {
        if (state <= this.state) return false;
        this.state = state;
        return true;
    }

    public isState(state: ConnectionState): boolean {
        return this.state === state;
    }

    public getState(): ConnectionState {
        return this.state;
    }

    public abstract send(payload: Payload): void;

    public abstract tick(): void;
}