import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {PosPacket} from "../../network/packet/PosPacket.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";

export class ClientNetwork {
    public static registerNetwork(): void {
        PayloadTypeRegistry.playC2S().register(PosPacket.ID, PosPacket.CODEC);
        PayloadTypeRegistry.playC2S().register(StringPacket.ID, StringPacket.CODEC);
    }
}