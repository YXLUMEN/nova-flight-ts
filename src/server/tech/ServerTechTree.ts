import type {TechTree} from "../../tech/TechTree.ts";
import {TechState} from "../../tech/TechState.ts";
import type {NbtCompound} from "../../nbt/NbtCompound.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {Items} from "../../item/Items.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {applyServerTech} from "./applyServerTech.ts";
import {Registries} from "../../registry/Registries.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Tech} from "../../tech/Tech.ts";

export class ServerTechTree implements TechTree {
    private readonly player: ServerPlayerEntity;
    private readonly state: TechState;

    public constructor(player: ServerPlayerEntity) {
        this.player = player;
        const techState = Registries.TECH
            .getEntries()
            .map(entry => entry.getValue())
            .toArray();
        this.state = new TechState(techState);
    }

    public isUnlocked(tech: RegistryEntry<Tech>): boolean {
        return this.state.isUnlocked(tech.getValue());
    }

    public unlock(tech: RegistryEntry<Tech>): boolean {
        const isDev = this.player.isDevMode();
        const score = this.player.getScore() - tech.getValue().cost;
        if (score < 0 && !isDev) return false;
        if (this.state.unlock(tech.getValue())) {
            this.player.setScore(score);
            return true;
        }

        return false;
    }

    public forceUnlock(tech: RegistryEntry<Tech>): void {
        this.state.forceUnlock(tech.getValue());
        applyServerTech(tech, this.player);
    }

    public unlockAll() {
        const all = this.state.allTechs;
        for (const tech of all) {
            if (this.state.isUnlocked(tech)) continue;
            this.state.forceUnlock(tech);
        }
    }

    public unloadedTechCount(): number {
        return this.state.unlocked.size;
    }

    public resetTech() {
        // noinspection DuplicatedCode
        const player = this.player;

        const allTech = this.state.allTechs;
        const unlocked: Tech[] = [];
        for (const tech of allTech) {
            if (this.state.isUnlocked(tech)) unlocked.push(tech);
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

        player.networkHandler?.send(new PlayerSetScoreS2CPacket(finalScore));
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        const ids = this.state.unlocked
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString());

        nbt.putStringArray('Techs', ...ids);
        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        const techs = nbt.getStringArray('Techs');
        if (techs.length === 0) return;

        for (const id of techs) {
            const tech = this.state.getTech(id);
            if (!tech) throw new Error(`Fail to parse tech with id: ${id}`);

            this.state.unlock(tech);
        }
    }
}