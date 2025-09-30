import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import type {IOwnable} from "../IOwnable.ts";
import type {EntityType} from "../EntityType.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataTracker} from "../data/DataTracker.ts";
import {type NbtCompound} from "../../nbt/NbtCompound.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable {
    public readonly damage: number;

    private ownerUuid: string | null = null;
    private owner: Entity | null = null;

    public color = "#8cf5ff";
    public edgeColor = '';

    public constructor(type: EntityType<ProjectileEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world);

        this.damage = damage;
        this.setOwner(owner);
    }

    public override tick() {
        super.tick();

        const pos = this.getPositionRef;
        pos.addVec(this.getVelocityRef);

        if (this.shouldWrap()) {
            if (this.age++ > 200 || pos.y < -20 || pos.y > World.WORLD_H + 20) {
                this.discard();
                return;
            }

            this.wrapPosition();
            return;
        }

        if (pos.y < -20 || pos.y > World.WORLD_H + 20 || pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
        }
    }

    public abstract onEntityHit(entity: Entity): void;

    public setOwner(entity: Entity | null): void {
        if (entity) {
            this.ownerUuid = entity.getUuid();
            this.owner = entity;
        }
    }

    public getOwner(): Entity | null {
        if (this.owner && !this.owner.isRemoved()) {
            return this.owner;
        }
        if (this.ownerUuid) {
            this.owner = this.getWorld().getEntity(this.ownerUuid);
            return this.owner;
        }
        return null;
    }

    protected isOwner(entity: Entity) {
        return entity.getUuid() === this.ownerUuid;
    }

    protected wrapPosition(): boolean {
        const pos = this.getPositionRef;
        const W = World.WORLD_W;
        pos.x = ((pos.x % W) + W) % W;
        return true;
    }

    public override shouldWrap(): boolean {
        return this.getOwner()?.shouldWrap() ?? false;
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        if (this.ownerUuid) {
            nbt.putString('Owner', this.ownerUuid);
        }
        nbt.putString('Color', this.color);
        nbt.putString('EdgeColor', this.edgeColor);

        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        const ownerUuid = nbt.getString('Owner');
        this.ownerUuid = ownerUuid.length > 0 ? ownerUuid : null;
        this.color = nbt.getString('Color');
        this.edgeColor = nbt.getString('EdgeColor');
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}