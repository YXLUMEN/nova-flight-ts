import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {PlayerLoginC2SPayload} from "../../network/packet/c2s/PlayerLoginC2SPayload.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {BaseEnemy} from "../../entity/mob/BaseEnemy.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {applyServerTech} from "../../tech/applyServerTech.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {clamp} from "../../utils/math/math.ts";

export class ServerReceive {
    public static registryNetworkHandler(channel: ServerNetworkChannel) {
        channel.receive(StringPacket.ID, payload => {
            if (payload.value !== 'Hello Server!') return;

            const world = NovaFlightServer.getInstance().world;
            if (!world) return;
            const mob = new BaseEnemy(EntityTypes.BASE_ENEMY, world, 1);
            mob.setPosition(64, 0);
            world.spawnEntity(mob);
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

        channel.receive(PlayerLoginC2SPayload.ID, async payload => {
            const uuid = payload.uuid;
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            if (world.getEntity(uuid) !== null) {
                console.warn(`Player multi login ${uuid}`);
                return;
            }

            const res = await fetch('/resources/nova-flight/data/tech-data.json');
            const text = await res.json();
            const player = new ServerPlayerEntity(world, text);
            player.setUuid(uuid);
            world.spawnPlayer(player);
        });

        channel.receive(PlayerMoveC2SPacket.ID, payload => {
            const uuid = payload.uuid;
            const world = NovaFlightServer.getInstance().world;
            if (!world) return;

            const player = world.getEntity(uuid) as ServerPlayerEntity | null;
            if (!player) return;

            const speedMultiplier = player.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = player.getMovementSpeed() * speedMultiplier;
            player.updateVelocity(speed, payload.velocityX, payload.velocityY);
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
    }
}