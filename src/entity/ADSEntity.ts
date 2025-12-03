import {Entity} from "./Entity.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "./data/DataTracker.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {IOwnable} from "./IOwnable.ts";
import type {LivingEntity} from "./LivingEntity.ts";
import {distanceVec2} from "../utils/math/math.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class ADSEntity extends Entity implements IOwnable {
    private static readonly RADIUS = 256 * 256;
    private readonly owner: LivingEntity | null;

    public constructor(type: EntityType<ADSEntity>, world: World, owner: LivingEntity | null = null) {
        super(type, world);
        this.owner = owner;
    }

    public static async spawnInterceptPathParticles(world: ServerWorld, start: IVec, end: IVec) {
        const mod = await import('../effect/LaserBeamEffect.ts');
        const effect = new mod.LaserBeamEffect('#fff', 1, 0.1);
        effect.set(start, end);
        world.spawnEffect(null, effect);
    }

    public override tick() {
        super.tick();

        if ((this.age & 7) !== 0) return;
        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        const selfPos = this.getPosition();
        const projectiles = world.getProjectiles();

        let intercepted = 0;
        for (const projectile of projectiles) {
            if (projectile.getOwner() === this.owner) continue;

            const projPos = projectile.getPositionRef;
            if (distanceVec2(projPos, selfPos) > ADSEntity.RADIUS) continue;
            const proVel = projectile.getVelocityRef;

            const toSelf = selfPos.subVec(projPos);
            const dot = proVel.x * toSelf.x + proVel.y * toSelf.y;
            if (dot < 0) continue;

            const velSq = proVel.x * proVel.x + proVel.y * proVel.y;
            if (velSq < 1e-4) continue; // 低速

            const t = dot / velSq; // 到达最近点的时间
            if (t < 0) continue;

            ADSEntity.spawnInterceptPathParticles(world, selfPos, projPos);
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