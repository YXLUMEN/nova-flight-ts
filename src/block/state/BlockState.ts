import {Block} from "../Block.ts";
import {StateHolder} from "./StateHolder.ts";
import {Property} from "./properties/Property.ts";
import type {Comparable} from "../../type/Comparable.ts";
import type {BlockPos} from "../../world/section/pos/BlockPos.ts";
import type {World} from "../../world/World.ts";

export class BlockState extends StateHolder<Block, BlockState> {
    public readonly isAir: boolean;
    public readonly destroySpeed: number;

    public isRandomlyTicking: boolean = false;

    public constructor(block: Block, keys: Property<any>[], values: Comparable[]) {
        super(block, keys, values);
        const properties = block.getProperties();

        this.isAir = properties.isAir;
        this.destroySpeed = properties.destroyTime;
    }

    public initCache(): void {
        this.isRandomlyTicking = this.owner.isRandomlyTicking(this);
    }

    public getBlock(): Block {
        return this.owner;
    }

    public is(block: Block): boolean {
        return this.owner === block;
    }

    public onPlace(world: World, pos: BlockPos, oldState: BlockState): void {
        this.getBlock().onPlace(world, pos, this, oldState);
    }
}