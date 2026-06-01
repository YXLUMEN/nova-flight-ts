import type {TechTree} from "../../world/tech/TechTree.ts";
import {TechState} from "../../world/tech/TechState.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {Items} from "../../item/Items.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {Registries} from "../../registry/Registries.ts";
import {type RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {type Tech} from "../../world/tech/Tech.ts";
import {Techs} from "../../world/tech/Techs.ts";
import {ServerTechManager} from "./ServerTechManager.ts";

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
        ServerTechManager.apply(tech, this.player);
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

    public resetTech(entry: RegistryEntry<Tech>): boolean {
        const tech = entry.getValue();
        if (!this.state.isUnlocked(tech)) {
            return false;
        }

        const techsToRevoke = this.state.collectDescendantsToRevoke(tech);
        if (techsToRevoke.length === 0) return false;

        let backScore = 0;
        for (const revoke of techsToRevoke) {
            const entry = Registries.TECH.getEntryByValue(revoke);
            if (!entry) continue;

            this.state.unlocked.delete(revoke);
            backScore += revoke.cost;
            ServerTechManager.remove(entry, this.player);
        }

        const finalScore = this.player.getScore() + Math.floor(backScore * 0.8);
        this.player.setScore(finalScore);

        if (!this.isUnlocked(Techs.STEERING_GEAR)) {
            this.player.setYaw(-1.57079);
        }

        this.player.networkHandler.send(new PlayerSetScoreS2CPacket(this.player.getScore()));
        return true;
    }

    public resetAllTech() {
        // noinspection DuplicatedCode
        const player = this.player;

        const unlocked: Tech[] = [];
        for (const tech of this.state.allTechs) {
            if (this.state.isUnlocked(tech)) unlocked.push(tech);
        }

        if (unlocked.length === 0) return;

        let backScore = 0;
        for (const tech of unlocked) {
            backScore += tech.cost;
        }

        const finalScore = player.getScore() + Math.floor(backScore * 0.8);
        player.setScore(finalScore);
        this.resetPlayer();

        this.state.reset();

        player.networkHandler.send(new PlayerSetScoreS2CPacket(finalScore));
    }

    private resetPlayer() {
        this.player.clearItems();

        this.player.addItem(Items.CANNON40);
        this.player.addItem(Items.BOMB_WEAPON);
        this.player.setYaw(-1.57079);
    }

    public destroy(): void {
        this.state.clear();
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        const ids = this.state.unlocked
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString())
            .toArray();

        nbt.setStringArray('techs', ids);
        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        const techs = nbt.getStringArray('techs');
        if (techs.length === 0) return;

        for (const id of techs) {
            const tech = this.state.getTech(id);
            if (!tech) {
                console.warn(`Fail to parse tech with id: ${id}`);
                continue;
            }

            this.state.unlock(tech);
        }
    }
}