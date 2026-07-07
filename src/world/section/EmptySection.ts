import {LevelSection} from "./LevelSection.ts";
import type {BlockState} from "../../block/state/BlockState.ts";
import {Blocks} from "../../block/Blocks.ts";

export class EmptySection extends LevelSection {
    public static readonly INSTANCE: EmptySection = Object.freeze(new EmptySection()) as EmptySection;

    private constructor() {
        // @ts-ignore
        super(null);
    }

    public recalcBlockCounts() {
    }

    public getBlockState(): BlockState {
        return Blocks.AIR.defaultState();
    }

    public setBlockState(): BlockState {
        console.warn('Set block state in empty section');
        return Blocks.AIR.defaultState();
    }

    public hasOnlyAir(): boolean {
        return true;
    }

    public tryCompact(): void {
    }

    public write(): void {
    }

    public read(): void {
    }
}