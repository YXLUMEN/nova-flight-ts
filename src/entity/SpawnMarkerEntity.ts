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
    private readonly force;

    public constructor(type: EntityType<SpawnMarkerEntity>, world: World, mob: MobEntity, force = false) {
        super(type, world);
        this.spawnMob = mob;
        this.force = force;
    }

    public override tick() {
        super.tick();
        if (this.age++ >= 200) {
            this.discard();
            const world = this.getWorld();
            if (world.isPeaceMode()) return;

            if (!this.force) {
                const player = world.player;
                if (!player) return;

                const dx = this.spawnMob.getPositionRef.x - player.getPositionRef.x;
                const dy = this.spawnMob.getPositionRef.y - player.getPositionRef.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 4096) return;
            }

            this.getWorld().spawnEntity(this.spawnMob);
        }
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