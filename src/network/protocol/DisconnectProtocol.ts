import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {ConnectionState} from "../../server/network/ConnectionState.ts";
import {empty} from "../../utils/util.ts";

export class DisconnectProtocol {
    public static readonly CLIENT_BOUND = ProtocolInfoBuilder.clientBound(
        ConnectionState.DISCONNECTING,
        empty
    );
}