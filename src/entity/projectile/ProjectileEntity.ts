import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import type {IOwnable} from "../IOwnable.ts";
import type {EntityType} from "../EntityType.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataTracker} from "../data/DataTracker.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable {
    public readonly damage: number;
    public owner: Entity | null;
    public color = "#8cf5ff";
    public edgeColor = '';

    public constructor(type: EntityType<ProjectileEntity>, world: World, owner: Entity | null, damage: number) {
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

    public setOwner(entity: Entity | null): void {
        if (entity !== null) {
            this.owner = entity;
        }
    }

    public getOwner(): Entity | null {
        return this.owner;
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}