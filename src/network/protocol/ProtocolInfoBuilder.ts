import type {PacketCodec} from "../codec/PacketCodec.ts";
import type {Payload} from "../Payload.ts";
import type {PayloadType} from "../PayloadType.ts";
import type {Consumer} from "../../type/types.ts";
import {NetworkSide} from "../NetworkSide.ts";
import {ProtocolInfo} from "./ProtocolInfo.ts";
import {ConnectionState} from "../../server/network/ConnectionState.ts";
import {IdDispatchCodec} from "../codec/IdDispatchCodec.ts";

export class ProtocolInfoBuilder {
    private readonly protocol: ConnectionState;
    private readonly side: NetworkSide;
    private readonly codecs: CodecEntry<any>[];

    public constructor(protocol: ConnectionState, side: NetworkSide) {
        this.protocol = protocol;
        this.side = side;
        this.codecs = [];
    }

    public add<P extends Payload>(type: PayloadType<P>, codec: PacketCodec<P>) {
        this.codecs.push({type, codec});
        return this;
    }

    public buildPackCodec(codecs: CodecEntry<any>[]) {
        const builder = IdDispatchCodec.builder<Payload, PayloadType<any>>(v => v.type());
        for (const codec of codecs) builder.addEntry(codec);
        return builder.build();
    }

    public build(): ProtocolInfo {
        return new ProtocolInfo(this.protocol, this.side, this.buildPackCodec(Array.from(this.codecs)));
    }

    private static protocol(protocol: ConnectionState, side: NetworkSide, config: Consumer<ProtocolInfoBuilder>) {
        const builder = new ProtocolInfoBuilder(protocol, side);
        config(builder);
        return builder.build();
    }

    public static serverBound(protocol: ConnectionState, config: Consumer<ProtocolInfoBuilder>) {
        return this.protocol(protocol, NetworkSide.SERVER, config);
    }

    public static clientBound(protocol: ConnectionState, config: Consumer<ProtocolInfoBuilder>) {
        return this.protocol(protocol, NetworkSide.CLIENT, config);
    }

    public static relayBound(config: Consumer<ProtocolInfoBuilder>) {
        return this.protocol(ConnectionState.HANDSHAKING, NetworkSide.SERVER, config);
    }
}

interface CodecEntry<P extends Payload> {
    readonly type: PayloadType<P>;
    readonly codec: PacketCodec<P>;
}