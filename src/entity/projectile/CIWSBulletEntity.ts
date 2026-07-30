import {BulletEntity} from "./BulletEntity.ts";
import {type NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import {MobEntity} from "../mob/MobEntity.ts";
import {rand} from "../../utils/math/math.ts";

export class CIWSBulletEntity extends BulletEntity {
    private readonly maxAge: number;

    public constructor(
        type: EntityType<CIWSBulletEntity>,
        world: World,
        owner: Entity | null,
        damage: number,
        maxAge: number = 8
    ) {
        super(type, world, owner, damage);
        this.maxAge = maxAge;
    }

    public override tick() {
        super.tick();

        if (this.age >= this.maxAge) this.discard();
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.setUint32('age', this.age);
        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.age = nbt.getUint32('age');
    }

    public override canHit(entity: Entity): boolean {
        if (entity.isRemoved()) return false;

        if (entity === this.getOwner()) {
            return false;
        }

        if (entity instanceof ProjectileEntity) {
            return entity.getOwner() !== this.getOwner();
        }

        return true;
    }

    protected override onEntityHit(hitResult: EntityHitResult) {
        super.onEntityHit(hitResult);

        if (this.isClient()) return;
        const entity = hitResult.entity;
        if (entity instanceof ProjectileEntity && entity.getOwner() !== this.getOwner()) {
            entity.onIntercept(this.getHitDamage());
            return;
        }
        if (entity instanceof MobEntity) {
            entity.velocityRef.multiply(0.8);
        }
    }
}