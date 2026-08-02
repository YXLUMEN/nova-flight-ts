import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";

export class PlayerProfilesS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerProfilesS2CPacket> = payloadType('player_profiles');
    public static readonly CODEC: PacketCodec<PlayerProfilesS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.collection(PacketCodecs.STRING),
        val => val.playerNames,
        PacketCodecs.collection(PacketCodecs.UUID),
        val => val.uuids,
        PlayerProfilesS2CPacket.new
    );

    public readonly playerNames: string[];
    public readonly uuids: UUID[];

    public constructor(playerName: string[], uuid: UUID[]) {
        this.playerNames = playerName;
        this.uuids = uuid;
    }

    public static new(playerName: string[], uuid: UUID[]) {
        return new PlayerProfilesS2CPacket(playerName, uuid);
    }

    public static create(players: Iterable<ServerPlayerEntity>) {
        const names: string[] = [];
        const uuid: UUID[] = [];
        for (const player of players) {
            names.push(player.playerProfile.name);
            uuid.push(player.getUUID());
        }
        return new PlayerProfilesS2CPacket(names, uuid);
    }

    public type(): PayloadType<PlayerProfilesS2CPacket> {
        return PlayerProfilesS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPlayerProfiles(this);
    }
}