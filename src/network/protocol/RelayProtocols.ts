import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {Attached} from "../packet/relay/Attached.ts";
import {Detached} from "../packet/relay/Detached.ts";
import {ClientAttached} from "../packet/relay/ClientAttached.ts";
import {RelayMessage} from "../packet/relay/RelayMessage.ts";

export class RelayProtocols {
    public static readonly RELAY = ProtocolInfoBuilder.relayBound(
        builder => builder
            .add(Detached.ID, Detached.CODEC)
            .add(Attached.ID, Attached.CODEC)
            .add(ClientAttached.ID, ClientAttached.CODEC)
            .add(RelayMessage.ID, RelayMessage.CODEC)
    )
}