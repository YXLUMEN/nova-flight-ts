import {MissileEntity} from "./MissileEntity.ts";
import {World} from "../../world/World.ts";
import type {EntityType} from "../EntityType.ts";
import type {Entity} from "../Entity.ts";

export class MobMissileEntity extends MissileEntity {
    public constructor(type: EntityType<MissileEntity>, world: World, owner: Entity, driftAngle: number) {
        super(type, world, owner, driftAngle, 'player', 5);
    }

    protected override adjustPosition(): boolean {
        const pos = this.getPositionRef;
        if (pos.y < -20 || pos.y > World.H + 20 || pos.x < -20 || pos.x > World.W + 20) {
            this.discard();
            return false;
        }
        return true;
    }
}