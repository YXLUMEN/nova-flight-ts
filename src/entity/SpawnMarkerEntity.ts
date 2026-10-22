import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import type {MobEntity} from "./mob/MobEntity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {Entity} from "./Entity.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "./data/DataTracker.ts";
import {World} from "../world/World.ts";
import {spawnTeleportFx} from "../utils/render/TeleportFx.ts";

export class SpawnMarkerEntity extends Entity {
    public override noClip = true;
    public override readonly invulnerable = true;

    private readonly spawnMob: MobEntity | null;
    private readonly force: boolean;

    public constructor(
        type: EntityType<SpawnMarkerEntity>,
        world: World,
        mob: MobEntity | null = null,
        force: boolean = false
    ) {
        super(type, world);
        this.spawnMob = mob;
        this.force = force;
    }

    public override tick() {
        super.tick();
        if (this.age < 80) return;

        this.discard();
        const world = this.getWorld() as ServerWorld;
        if (world.isPeaceMode() || world.isClient || this.spawnMob === null) return;

        if (this.force) {
            world.spawnEntity(this.spawnMob);
            spawnTeleportFx(world, this.positionRef, this.positionRef);
            return;
        }

        const box = this.spawnMob.getBoundingBox().expandAll(24);
        const canSpawn = world.getPlayers().every(player => {
            return player.isRemoved() || !player.getBoundingBox().intersectsByBox(box);
        });
        if (!canSpawn) return;

        world.spawnEntity(this.spawnMob);
        spawnTeleportFx(world, this.positionRef, this.positionRef);
    }

    public override canHitByProjectile(): boolean {
        return false;
    }

    public override shouldSave(): boolean {
        return false;
    }

    public override onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public override onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected override defineSyncedData(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}