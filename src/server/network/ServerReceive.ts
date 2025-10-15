import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";
import {DebugStringPacket} from "../../network/packet/DebugStringPacket.ts";
import {ClientSniffingC2SPacket} from "../../network/packet/c2s/ClientSniffingC2SPacket.ts";

export class ServerReceive {
    public static registryNetworkHandler(channel: ServerNetworkChannel) {
        channel.receive(ClientSniffingC2SPacket.ID, () => {
            const world = NovaFlightServer.getInstance().world;
            if (!world) {

            }
        });

        channel.receive(DebugStringPacket.ID, payload => {
            if (payload.value === 'StopServer') {
                return NovaFlightServer.getInstance().stopGame();
            }
        });
    }
}