import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import type {IOwnable} from "../IOwnable.ts";
import type {EntityType} from "../EntityType.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataTracker} from "../data/DataTracker.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable {
    public readonly damage: number;
    public readonly owner: LivingEntity | null;
    public color = "#8cf5ff";

    protected boxRadius: number = this.getEntityDimension().width;

    public constructor(type: EntityType<ProjectileEntity>, world: World, owner: LivingEntity, damage: number) {
        super(type, world);

        this.damage = damage;
        this.owner = owner;
    }

    public override tick() {
        super.tick();

        const pos = this.getPositionRef;
        pos.addVec(this.getVelocityRef);

        if (pos.y < -20 || pos.y > World.H + 20 || pos.x < -20 || pos.x > World.W + 20) {
            this.discard();
        }
    }

    public abstract onEntityHit(entity: Entity): void;

    public getOwner(): LivingEntity | null {
        return this.owner;
    }

    public getBoxRadius() {
        return this.boxRadius;
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}