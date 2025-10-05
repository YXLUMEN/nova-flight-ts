import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {PosPacket} from "../../network/packet/PosPacket.ts";

export class ServerReceive {
    public static registryNetworkHandler(channel: ServerNetworkChannel) {
        channel.receive(StringPacket.ID, (packet) => {
            console.log(packet);
            channel.send(new StringPacket('Hello Client!'));
        });

        channel.receive(PosPacket.ID, (packet) => {
            console.log(packet);
        });
    }
}