import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import type {IOwnable} from "../IOwnable.ts";
import type {EntityType} from "../EntityType.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataTracker} from "../data/DataTracker.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable {
    public readonly damage: number;
    public readonly owner: Entity;
    public color = "#8cf5ff";

    protected boxRadius: number = this.getEntityWidth();

    public constructor(type: EntityType<ProjectileEntity>, world: World, owner: Entity, damage: number) {
        super(type, world);

        this.damage = damage;
        this.owner = owner;
    }

    public override tick(dt: number) {
        this.getMutPos.x += this.getVelocity().x * dt;
        this.getMutPos.y += this.getVelocity().y * dt;

        if (this.getMutPos.y < -20 || this.getMutPos.y > World.H + 20 || this.getMutPos.x < -20 || this.getMutPos.x > World.W + 20) {
            this.discard();
        }
    }

    public abstract onEntityHit(entity: Entity): void;

    public getOwner(): Entity {
        return this.owner;
    }

    public getBoxRadius() {
        return this.boxRadius;
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}