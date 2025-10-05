import {StringPacket} from "../../network/packet/StringPacket.ts";
import type {ClientNetworkChannel} from "./ClientNetworkChannel.ts";

export class ClientReceive {
    public static registryNetworkHandler(channel: ClientNetworkChannel) {
        channel.receive(StringPacket.ID, (packet) => {
            console.log(packet);
        });
    }
}