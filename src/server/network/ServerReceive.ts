import {NovaFlightServer} from "../NovaFlightServer.ts";
import {ClientSniffingC2SPacket} from "../../network/packet/c2s/ClientSniffingC2SPacket.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";

export class ServerReceive {
    public static registryNetworkHandler(channel: ServerNetworkChannel) {
        channel.receive(ClientSniffingC2SPacket.ID, packet => {
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            channel.sendTo(new ServerReadyS2CPacket(), packet.clientId);
        });
    }
}