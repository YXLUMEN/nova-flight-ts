import type {TechTree} from "./TechTree.ts";
import {TechState} from "./TechState.ts";
import type {NbtCompound} from "../nbt/NbtCompound.ts";
import tech from "./tech-data.json";

export class ServerTechTree implements TechTree {
    private readonly state: TechState;

    public constructor() {
        const techState = TechState.normalizeTechs(tech);
        this.state = new TechState(techState);
    }

    public isUnlocked(id: string): boolean {
        return this.state.isUnlocked(id);
    }

    public unlock(id: string): boolean {
        return this.state.unlock(id);
    }

    public unlockAll() {
        const all = Array.from(this.state.techById.keys());
        for (const nid of all) {
            if (this.state.isUnlocked(nid)) continue;

            this.state.forceUnlock(nid);
        }
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