import {ServerPlayerEntity} from "../../../src/server/entity/ServerPlayerEntity.ts";
import {NbtCompound} from "../../../src/nbt/NbtCompound.ts";
import {WorldLoader} from "../io/WorldLoader.ts";
import {PlayerManager} from "../../../src/server/entity/PlayerManager.ts";

export class NodePlayManager extends PlayerManager {
    public override loadPlayerData(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        return WorldLoader.loadPlayer(player);
    }

    protected override savePlayerData(player: ServerPlayerEntity): Promise<void> {
        return WorldLoader.savePlayer(player);
    }
}