import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {Attached} from "../packet/relay/Attached.ts";
import {Detached} from "../packet/relay/Detached.ts";
import {ClientAttached} from "../packet/relay/ClientAttached.ts";
import {RelayMessage} from "../packet/relay/RelayMessage.ts";
import {ClientActive} from "../packet/relay/ClientActive.ts";

export class RelayProtocols {
    public static readonly SERVER = ProtocolInfoBuilder.relayBound(
        builder => builder
            .add(Detached.ID, Detached.CODEC) // 0x00
            .add(Attached.ID, Attached.CODEC) // 0x01
            .add(ClientAttached.ID, ClientAttached.CODEC) // 0x02
            .add(ClientActive.ID, ClientActive.CODEC) // 0x03
            .add(RelayMessage.ID, RelayMessage.CODEC) // 0x04
    );
}