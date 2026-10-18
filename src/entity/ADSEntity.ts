import type {Ownable} from "./Ownable.ts";
import type {LivingEntity} from "./LivingEntity.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {Entity} from "./Entity.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "./data/DataTracker.ts";
import {World} from "../world/World.ts";
import {squareDistVec2} from "../utils/math/math.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {spawnFancyLaserByVec} from "../utils/ServerEffect.ts";
import {EntityPredicates} from "../world/predicate/EntityPredicates.ts";
import {ProjectileEntity} from "./projectile/ProjectileEntity.ts";
import {ParticleEffects} from "../effect/particle/ParticleEffects.ts";

export class ADSEntity extends Entity implements Ownable {
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

        const selfPos = this.positionRef;
        const box = this.getBoundingBox().expandAll(256);
        const entities = world.searchOtherEntities(this, box, EntityPredicates.DEFENSE) as Generator<ProjectileEntity>;

        let intercepted = 0;
        for (const projectile of entities) {
            const projPos = projectile.positionRef;
            if (squareDistVec2(projPos, selfPos) > ADSEntity.RADIUS ||
                !BallisticsUtils.isViableThreat(projPos, projectile.velocityRef, selfPos)
            ) continue;

            spawnFancyLaserByVec(world, selfPos, projPos, '#A6FFE380');
            world.spawnPreparedParticle(ParticleEffects.DECOY_FLASH, projPos, 4);
            projectile.onIntercept(10);
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

    protected defineSyncedData(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}