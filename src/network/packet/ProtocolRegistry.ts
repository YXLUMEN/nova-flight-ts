import {RelayPackets} from "../RelayPackets.ts";
import {ServerPackets} from "../../server/network/ServerPackets.ts";
import {ClientPackets} from "../../client/network/ClientPackets.ts";
import {CodecRegistry} from "../CodecRegistry.ts";

export class ProtocolRegistry {
    public static register() {
        RelayPackets.registerNetworkPacket();
        ServerPackets.registerNetworkPacket();
        ClientPackets.registerNetworkPacket();
        CodecRegistry.settle();
    }
}