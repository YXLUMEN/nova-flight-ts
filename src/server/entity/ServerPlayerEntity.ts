import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ServerTechTree} from "../../tech/ServerTechTree.ts";
import {DataLoader} from "../../DataLoader.ts";

export class ServerPlayerEntity extends PlayerEntity {
    public constructor(world: ServerWorld) {
        super(world);

        this.techTree = new ServerTechTree(DataLoader.get('tech-tree'));
    }
}