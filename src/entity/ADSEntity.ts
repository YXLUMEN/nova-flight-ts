import {Entity} from "./Entity.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "./data/DataTracker.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {IOwnable} from "./IOwnable.ts";
import type {LivingEntity} from "./LivingEntity.ts";
import {squareDistVec2} from "../utils/math/math.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {spawnLaserByVec} from "../utils/ServerEffect.ts";
import {EntityPredicates} from "../predicate/EntityPredicates.ts";

export class ADSEntity extends Entity implements IOwnable {
    private static readonly RADIUS = 256 * 256;
    private readonly owner: LivingEntity | null;

    public constructor(type: EntityType<ADSEntity>, world: World, owner: LivingEntity | null = null) {
        super(type, world);
        this.owner = owner;
    }

    public override tick() {
        super.tick();

        if ((this.age & 7) !== 0) return;
        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        const selfPos = this.getPosition();
        const box = this.getBoundingBox().expandAll(256);
        const entities = world.searchOtherEntities(this, box, EntityPredicates.DEFENSE);

        let intercepted = 0;
        for (const projectile of entities) {
            const projPos = projectile.getPositionRef;
            if (squareDistVec2(projPos, selfPos) > ADSEntity.RADIUS ||
                !BallisticsUtils.isViableThreat(projPos, projectile.getVelocityRef, selfPos)
            ) continue;

            spawnLaserByVec(world, selfPos, projPos);
            projectile.discard();
            if (intercepted++ >= 5) break;
        }
    }

    public getOwner(): Entity | null {
        return this.owner;
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}