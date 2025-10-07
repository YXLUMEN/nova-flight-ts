import {Entity} from "./Entity.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataEntry} from "./data/DataEntry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {MobEntity} from "./mob/MobEntity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";

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
        if (this.age >= 80) {
            this.discard();
            const world = this.getWorld() as ServerWorld;
            if (world.isPeaceMode() || world.isClient) return;

            if (!this.force) {
                const {x, y} = this.spawnMob.getPositionRef;
                const canSpawn = world.getPlayers().every(player => {
                    if (player.isRemoved()) return true;
                    const dx = x - player.getPositionRef.x;
                    const dy = y - player.getPositionRef.y;
                    const distSq = dx * dx + dy * dy;
                    return distSq >= 6144;
                });
                if (!canSpawn) return;
            }

            world.spawnEntity(this.spawnMob);
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