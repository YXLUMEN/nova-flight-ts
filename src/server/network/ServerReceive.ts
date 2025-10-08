import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {applyServerTech} from "../../tech/applyServerTech.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {clamp} from "../../utils/math/math.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {RequestPositionC2SPacket} from "../../network/packet/c2s/RequestPositionC2SPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";

export class ServerReceive {
    public static registryNetworkHandler(channel: ServerNetworkChannel) {
        channel.receive(PlayerAttemptLoginC2SPacket.ID, async payload => {
            const clientId = payload.clientId;

            const server = NovaFlightServer.getInstance();
            const world = server.world;
            if (!world) return;

            if (server.loginPlayers.has(clientId)) {
                console.warn(`Server attempted to add player prior to sending player info (Player id ${clientId})`);
                return;
            }

            const res = await fetch('/resources/nova-flight/data/tech-data.json');
            const text = await res.json();
            const player = new ServerPlayerEntity(world, text);
            player.setUuid(clientId);
            world.spawnPlayer(player);
            channel.sendTo(new JoinGameS2CPacket(player.getId()), clientId);
        });

        channel.receive(PlayerAimC2SPacket.ID, payload => {
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;
            const player = world.getEntity(payload.uuid);
            if (!player) return;

            const pointer = payload.aim;
            const posRef = player.getPositionRef;
            player.setClampYaw(Math.atan2(
                pointer.y - posRef.y,
                pointer.x - posRef.x
            ), 0.3926875);
        });

        channel.receive(PlayerInputC2SPacket.ID, payload => {
            const uuid = payload.uuid;
            const key = payload.key;
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;
            player.handlerInput(key);
        });

        channel.receive(PlayerFireC2SPacket.ID, payload => {
            const uuid = payload.uuid;
            const start = payload.start;
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;
            player.setFiring(start);
        });

        channel.receive(PlayerMoveC2SPacket.ID, payload => {
            const uuid = payload.uuid;
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;

            const speedMultiplier = player.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = player.getMovementSpeed() * speedMultiplier;
            player.updateVelocity(speed, payload.dx, payload.dy);
        });

        channel.receive(PlayerUnlockTechC2SPacket.ID, payload => {
            const uuid = payload.uuid;
            const name = payload.techName;

            const world = NovaFlightServer.getInstance().world;
            if (!world) return;
            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;
            applyServerTech(name, player);
        });

        channel.receive(PlayerSwitchSlotC2SPacket.ID, payload => {
            const uuid = payload.uuid;
            const slot = payload.slot;

            const world = NovaFlightServer.getInstance().world;
            if (!world) return;
            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;

            player.currentBaseIndex = clamp(slot, 0, player.baseWeapons.length - 1);
        });

        channel.receive(RequestPositionC2SPacket.ID, payload => {
            const uuid = payload.playerId;
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;
            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;

            channel.sendTo(EntityPositionS2CPacket.create(player), payload.playerId);
        });
    }
}