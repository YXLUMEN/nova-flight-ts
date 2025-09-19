import {Entity} from "./Entity.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataEntry} from "./data/DataEntry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {IOwnable} from "./IOwnable.ts";
import {randInt} from "../utils/math/math.ts";

export class DecoyEntity extends Entity implements IOwnable {
    public static readonly Entities: DecoyEntity[] = [];
    private readonly owner: Entity | null = null;
    private readonly life = randInt(250, 320);

    public constructor(type: EntityType<DecoyEntity>, world: World, owner: Entity | null) {
        super(type, world);
        this.owner = owner;
        DecoyEntity.Entities.push(this);
    }

    public override tick() {
        if (this.age++ >= this.life) {
            DecoyEntity.Entities.shift();
            this.discard();
            return;
        }

        const yaw = this.getYaw();
        const velocity = this.getVelocityRef;
        this.updateVelocity(0.02, Math.cos(yaw), Math.sin(yaw));
        this.moveByVec(velocity);
        velocity.multiply(0.98);
    }

    public getOwner(): Entity | null {
        return this.owner;
    }

    protected override initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }

    public override onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public override onTrackedDataSet(_data: TrackedData<any>): void {
    }
}