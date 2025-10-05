import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {Vec2dPacket} from "../../network/packet/Vec2dPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/PlayerAimC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/PlayerMoveC2SPacket.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";

export class ServerReceive {
    public static registryNetworkHandler(channel: ServerNetworkChannel) {
        channel.receive(StringPacket.ID, (packet) => {
            console.log(packet);
            channel.send(new StringPacket('Hello Client!'));
        });

        channel.receive(Vec2dPacket.ID, (packet) => {
            console.log(packet);
        });

        channel.receive(PlayerAimC2SPacket.ID, (packet: PlayerAimC2SPacket) => {
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            const player = world.getEntity(packet.uuid);
            if (!player) return;

            const pointer = packet.aim;
            const posRef = player.getPositionRef;
            player.setClampYaw(Math.atan2(
                pointer.y - posRef.y,
                pointer.x - posRef.x
            ), 0.157075);
        });

        channel.receive(PlayerMoveC2SPacket.ID, (packet) => {
        });
    }
}