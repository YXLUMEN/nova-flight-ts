import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {PosPacket} from "../../network/packet/PosPacket.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";

export class ServerNetwork {
    public static registerNetwork() {
        PayloadTypeRegistry.playS2C().register(PosPacket.ID, PosPacket.CODEC);
        PayloadTypeRegistry.playS2C().register(StringPacket.ID, StringPacket.CODEC);
    }
}