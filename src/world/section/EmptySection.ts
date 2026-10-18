import {LevelSection} from "./LevelSection.ts";
import type {BlockState} from "../../block/state/BlockState.ts";
import {Blocks} from "../../block/Blocks.ts";

export class EmptySection extends LevelSection {
    public static readonly INSTANCE: EmptySection = Object.freeze(new EmptySection()) as EmptySection;

    private constructor() {
        // @ts-ignore
        super(null);
    }

    public override recalcBlockCounts() {
    }

    public override getBlockState(): BlockState {
        return Blocks.AIR.defaultState();
    }

    public override setBlockState(): BlockState {
        console.warn('Set block state in empty section');
        return Blocks.AIR.defaultState();
    }

    public override hasOnlyAir(): boolean {
        return true;
    }

    public override tryCompact(): void {
    }

    public override write(): void {
    }

    public override read(): void {
    }
}