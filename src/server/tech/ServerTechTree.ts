import type {TechTree} from "../../tech/TechTree.ts";
import {TechState} from "../../tech/TechState.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {Items} from "../../item/Items.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {Registries} from "../../registry/Registries.ts";
import {type RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {type Tech} from "../../tech/Tech.ts";
import {ApplyServerTech} from "./ApplyServerTech.ts";
import {Techs} from "../../tech/Techs.ts";

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
        ApplyServerTech.apply(tech, this.player);
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
        // noinspection DuplicatedCode
        const tech = entry.getValue();
        if (!this.state.isUnlocked(tech)) {
            return false;
        }

        const techsToRevoke = this.state.collectDescendantsToRevoke(tech);
        if (techsToRevoke.length === 0) return false;

        let backScore = 0;
        for (const tech of techsToRevoke) {
            this.state.unlocked.delete(tech);
            backScore += tech.cost;
        }

        const unlocked: Tech[] = [];
        for (const tech of this.state.allTechs) {
            if (this.state.isUnlocked(tech)) unlocked.push(tech);
        }

        const finalScore = this.player.getScore() + (backScore * 0.8) | 0;
        this.player.setScore(finalScore);

        const yaw = this.player.getYaw();
        this.resetPlayer();

        for (const tech of unlocked) {
            const entry = Registries.TECH.getEntryByValue(tech);
            if (entry) this.forceUnlock(entry);
        }

        if (this.isUnlocked(Techs.STEERING_GEAR)) {
            this.player.setYaw(yaw);
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

        const finalScore = player.getScore() + (backScore * 0.8) | 0;
        player.setScore(finalScore);
        this.resetPlayer();

        this.state.reset();

        player.networkHandler.send(new PlayerSetScoreS2CPacket(finalScore));
    }

    private resetPlayer() {
        this.player.clearItems();
        this.player.onDamageExplosionRadius = 320;

        this.player.addItem(Items.CANNON40_WEAPON);
        this.player.addItem(Items.BOMB_WEAPON);
        this.player.setYaw(-1.57079);
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        const ids = this.state.unlocked
            .values()
            .map(tech => this.state.getTechId(tech))
            .filter(id => id !== null)
            .map(id => id.toString())
            .toArray();

        nbt.putStringArray('techs', ids);
        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        const techs = nbt.getStringArray('techs');
        if (techs.length === 0) return;

        for (const id of techs) {
            const tech = this.state.getTech(id);
            if (!tech) throw new Error(`Fail to parse tech with id: ${id}`);

            this.state.unlock(tech);
        }
    }
}