import {hashCode} from "../../utils/hash.ts";
import {RelayProtocols} from "./RelayProtocols.ts";
import {HandshakeProtocols} from "./HandshakeProtocols.ts";
import {ConfigProtocols} from "./ConfigProtocols.ts";
import {PlayProtocol} from "./PlayProtocol.ts";
import {RelayCodeMap} from "../RelayCodeMap.ts";
import {DisconnectProtocol} from "./DisconnectProtocol.ts";

export class Protocols {
    public static VERSION: number;

    public static settle() {
        RelayCodeMap.init();
        this.VERSION = hashCode([
            RelayProtocols.RELAY,
            HandshakeProtocols.SERVER_BOUND,
            HandshakeProtocols.CLIENT_BOUND,
            ConfigProtocols.SERVER_BOUND,
            ConfigProtocols.CLIENT_BOUND,
            PlayProtocol.SERVER_BOUND,
            PlayProtocol.CLIENT_BOUND,
            DisconnectProtocol.CLIENT_BOUND,
        ]);
        Object.freeze(this);
    }
}