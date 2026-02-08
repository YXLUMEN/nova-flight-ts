import {BulletEntity} from "./BulletEntity.ts";
import {type NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";

export class CIWSBulletEntity extends BulletEntity {
    private readonly maxAge: number;

    public constructor(type: EntityType<CIWSBulletEntity>, world: World, owner: Entity | null, damage: number, maxAge: number = 8) {
        super(type, world, owner, damage);
        this.maxAge = maxAge;
    }

    public override tick() {
        super.tick();

        if (this.age >= this.maxAge) this.discard();
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.putUint32('age', this.age);
        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.age = nbt.getUint32('age');
    }

    public override onEntityHit(entity: Entity) {
        super.onEntityHit(entity);

        entity.getVelocityRef.multiply(0.8);
    }
}