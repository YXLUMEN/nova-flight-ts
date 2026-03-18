import {BulletEntity} from "./BulletEntity.ts";
import {type NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import {MobEntity} from "../mob/MobEntity.ts";

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

    public override canHit(entity: Entity): boolean {
        return entity.isAlive() && entity !== this.getOwner();
    }

    protected override onEntityHit(hitResult: EntityHitResult) {
        super.onEntityHit(hitResult);

        const entity = hitResult.entity;
        if (entity instanceof ProjectileEntity && entity.getOwner() !== this.getOwner()) {
            entity.onIntercept(this.getHitDamage());
            return;
        }
        if (entity instanceof MobEntity) {
            entity.getVelocityRef.multiply(0.8);
        }
    }
}