import type {TrackedData} from "./data/TrackedData.ts";
import type {EntityType} from "./EntityType.ts";
import type {MobEntity} from "./mob/MobEntity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {DataTrackerBuilder, DataTrackerSerializedEntry} from "./data/DataTracker.ts";
import {spawnTeleportFx} from "../utils/render/TeleportFx.ts";
import {Entity} from "./Entity.ts";
import {World} from "../world/World.ts";

export class SpawnMarkerEntity extends Entity {
    public override noClip = true;
    public override readonly invulnerable = true;

    private readonly spawnMob: MobEntity | null;
    private readonly force: boolean;
    private readonly delay: number;

    public constructor(
        type: EntityType<SpawnMarkerEntity>,
        world: World,
        mob: MobEntity | null = null,
        force: boolean = false,
        delay: number = 80,
    ) {
        super(type, world);
        this.spawnMob = mob;
        this.force = force;
        this.delay = delay;
    }

    public override tick() {
        super.tick();
        if (this.age < this.delay) return;

        this.discard();
        const world = this.getWorld() as ServerWorld;
        if (world.isPeaceMode() || world.isClient || this.spawnMob === null) return;

        if (this.force) {
            world.spawnEntity(this.spawnMob);
            spawnTeleportFx(world, this.positionRef, this.positionRef, undefined, this.spawnMob.getWidth() / 2);
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

    protected override defineSyncedData(_builder: DataTrackerBuilder): void {
    }
}