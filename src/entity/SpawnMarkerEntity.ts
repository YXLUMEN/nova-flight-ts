import {Entity} from "./Entity.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataEntry} from "./data/DataEntry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {MobEntity} from "./mob/MobEntity.ts";

export class SpawnMarkerEntity extends Entity {
    public readonly invulnerable = true;
    private readonly spawnMob: MobEntity;

    public constructor(type: EntityType<SpawnMarkerEntity>, world: World, mob: MobEntity) {
        super(type, world);
        this.spawnMob = mob;
    }

    public override tick() {
        super.tick();
        if (this.age++ >= 200) {
            this.discard();
            const player = World.instance.player;
            if (!player) return;

            const dx = this.spawnMob.getPositionRef.x - player.getPositionRef.x;
            const dy = this.spawnMob.getPositionRef.y - player.getPositionRef.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 4096) return false;

            this.getWorld().spawnEntity(this.spawnMob);
        }
    }

    protected override initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }

    public override onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public override onTrackedDataSet(_data: TrackedData<any>): void {
    }
}