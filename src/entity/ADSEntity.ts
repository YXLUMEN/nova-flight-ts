import {Entity} from "./Entity.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataEntry} from "./data/DataEntry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import {ProjectileEntity} from "./projectile/ProjectileEntity.ts";
import type {IOwnable} from "./IOwnable.ts";
import type {LivingEntity} from "./LivingEntity.ts";
import {dist2} from "../utils/math/math.ts";
import type {MutVec2} from "../utils/math/MutVec2.ts";

export class ADSEntity extends Entity implements IOwnable {
    private static readonly RADIUS = 256 * 256;
    private readonly owner: LivingEntity | null;

    public constructor(type: EntityType<ADSEntity>, world: World, owner: LivingEntity | null = null) {
        super(type, world);
        this.owner = owner;
    }

    public override tick() {
        super.tick();
        this.age++;

        if ((this.age & 7) !== 0) return;
        const world = this.getWorld();
        const entities = world.getEntities().values();

        for (const entity of entities) {
            if (entity instanceof ProjectileEntity && entity.owner !== this.owner) {
                if (dist2(entity.getPositionRef, this.getPositionRef) > ADSEntity.RADIUS) continue;
                ADSEntity.spawnInterceptPathParticles(world, this.getPositionRef.clone(), entity.getPositionRef.clone());
                entity.discard();
                break;
            }
        }
    }

    public static spawnInterceptPathParticles(world: World, start: MutVec2, end: MutVec2) {
        const diff = end.subVec(start);
        const length = diff.length();
        if (length < 0.001) return;

        const steps = length | 0;
        const dir = diff.normalize();

        for (let i = 0; i <= steps; i++) {
            world.spawnParticle(start.x, start.y, 0, 0,
                0.5, 2, '#fff', '#fff'
            );
            start.add(dir.x, dir.y);
        }
    }

    public getOwner(): Entity | null {
        return this.owner;
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}