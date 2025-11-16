import type {TechTree} from "./TechTree.ts";
import {TechState} from "./TechState.ts";
import type {NbtCompound} from "../nbt/NbtCompound.ts";
import tech from "./tech-data.json";
import type {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import type {Tech} from "../apis/ITech.ts";
import {Items} from "../item/items.ts";
import type {ServerNetworkChannel} from "../server/network/ServerNetworkChannel.ts";
import {PlayerSetScoreS2CPacket} from "../network/packet/s2c/PlayerSetScoreS2CPacket.ts";

export class ServerTechTree implements TechTree {
    private readonly player: ServerPlayerEntity;
    private readonly state: TechState;

    public constructor(player: ServerPlayerEntity) {
        this.player = player;
        const techState = TechState.normalizeTechs(tech);
        this.state = new TechState(techState);
    }

    public isUnlocked(id: string): boolean {
        return this.state.isUnlocked(id);
    }

    public unlock(id: string): boolean {
        const cost = this.state.getTech(id)?.cost;
        if (cost === undefined) return false;

        const isDev = this.player.getProfile().isDevMode();
        const score = this.player.getScore() - cost;
        if (score < 0 && !isDev) return false;
        if (this.state.unlock(id)) {
            this.player.setScore(score);
            return true;
        }

        return false;
    }

    public unlockAll() {
        const all = Array.from(this.state.techById.keys());
        for (const nid of all) {
            if (this.state.isUnlocked(nid)) continue;

            this.state.forceUnlock(nid);
        }
    }

    public resetTech() {
        // noinspection DuplicatedCode
        const player = this.player;

        const allTech = this.state.techById;
        const unlocked: Tech[] = [];
        for (const [nid, tech] of allTech) {
            if (this.state.isUnlocked(nid)) unlocked.push(tech);
        }

        if (unlocked.length === 0) return;

        let backScore = 0;
        for (const tech of unlocked) {
            const cost = tech.cost;
            if (cost) backScore += cost;
        }

        const finalScore = player.getScore() + (backScore * 0.8) | 0;
        player.setScore(finalScore);
        player.clearItems();

        player.addItem(Items.CANNON40_WEAPON);
        player.addItem(Items.BOMB_WEAPON);

        player.voidEdge = false;
        player.setYaw(-1.57079);

        this.state.reset();

        (player.getNetworkChannel() as ServerNetworkChannel).sendTo(new PlayerSetScoreS2CPacket(finalScore), player.getUUID());
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        nbt.putStringArray('Techs', ...this.state.unlocked);
        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        const techs = nbt.getStringArray('Techs');
        if (techs.length === 0) return;

        for (const tech of techs) {
            this.state.unlock(tech);
        }
    }
}