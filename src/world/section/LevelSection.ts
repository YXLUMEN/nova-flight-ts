import type {Serializable} from "../../serialization/Seriable.ts";
import {PalettedContainer} from "./palette/PalettedContainer.ts";
import {Blocks} from "../../block/Blocks.ts";
import {Block} from "../../block/Block.ts";
import type {BlockState} from "../../block/state/BlockState.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";


export class LevelSection implements Serializable {
    private solidCount: number = 0;
    private readonly states: PalettedContainer<BlockState>;

    public constructor(states: PalettedContainer<BlockState>) {
        this.states = states;
        this.recalcBlockCounts();
    }

    public static create() {
        return new LevelSection(new PalettedContainer(Blocks.AIR.defaultState(), Block.BLOCK_STATE_REGISTRY));
    }

    public getBlockState(localX: number, localY: number): BlockState {
        return this.states.get(localX, localY);
    }

    public setBlockState(localX: number, localY: number, state: BlockState): BlockState {
        const prev = this.states.getAndSet(localX, localY, state);

        if (!prev.isAir) {
            this.solidCount--;
        }
        if (!state.isAir) {
            this.solidCount++;
        }

        return prev;
    }

    public hasOnlyAir(): boolean {
        return this.solidCount === 0;
    }

    public getStates() {
        return this.states;
    }

    public tryCompact(): void {
        this.states.tryCompact();
    }

    public recalcBlockCounts(): void {
        this.states.count((state, count) => {
            if (state.isAir) return;
            this.solidCount += count;
        });
    }

    public write(writer: BinaryWriter): void {
        writer.writeInt8(this.solidCount);
        this.states.write(writer);
    }

    public read(reader: BinaryReader): void {
        this.solidCount = reader.readUint8();
        this.states.read(reader);
    }
}