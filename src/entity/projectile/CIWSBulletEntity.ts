import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {World} from "../../world/World.ts";
import {BulletEntity} from "./BulletEntity.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";

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

        return entity.canHitByProjectile();
    }

    protected override onEntityHit(hitResult: EntityHitResult) {
        super.onEntityHit(hitResult);
        if (isClient) return;

        const entity = hitResult.entity;
        if (entity instanceof ProjectileEntity) {
            const source = this.getWorld().getDamageSources().generic();
            entity.onIntercept(this.getHitDamage(), source);
            return;
        }

        entity.velocityRef.multiply(0.8);
    }
}