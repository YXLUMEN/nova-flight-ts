import {Entity} from "./Entity.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataEntry} from "./data/DataEntry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {IOwnable} from "./IOwnable.ts";
import {randInt} from "../utils/math/math.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";

export class DecoyEntity extends Entity implements IOwnable {
    public static readonly Entities = new Set<DecoyEntity>();
    private owner: Entity | null = null;
    private ownerUuid: string | null = null;
    private readonly life = randInt(250, 320);

    public constructor(type: EntityType<DecoyEntity>, world: World, owner: Entity | null) {
        super(type, world);
        this.setOwner(owner);
        DecoyEntity.Entities.add(this);
    }

    public override tick() {
        if (this.age >= this.life) {
            this.discard();
            return;
        }

        const yaw = this.getYaw();
        const velocity = this.getVelocityRef;
        this.updateVelocity(0.02, Math.cos(yaw), Math.sin(yaw));
        this.moveByVec(velocity);
        velocity.multiply(0.98);

        if (this.shouldWrap()) {
            const pos = this.getPositionRef;
            if (pos.y < -20 || pos.y > World.WORLD_H + 20) {
                this.discard();
                return;
            }
            this.wrapPosition();
            return;
        }

        const pos = this.getPositionRef;
        if (pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
        }
    }

    public override shouldWrap(): boolean {
        return this.getOwner()?.shouldWrap() ?? false;
    }

    public getOwner(): Entity | null {
        if (this.owner && !this.owner.isRemoved()) {
            return this.owner;
        }
        const world = this.getWorld();
        if (this.ownerUuid && !world.isClient) {
            this.owner = (world as ServerWorld).getEntity(this.ownerUuid);
            return this.owner;
        }
        return null;
    }

    public setOwner(entity: Entity | null): void {
        if (entity) {
            this.ownerUuid = entity.getUuid();
            this.owner = entity;
        }
    }

    public override onRemove() {
        super.onRemove();
        DecoyEntity.Entities.delete(this);
    }

    public override shouldSave(): boolean {
        return false;
    }

    protected override initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }

    public override onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public override onTrackedDataSet(_data: TrackedData<any>): void {
    }
}