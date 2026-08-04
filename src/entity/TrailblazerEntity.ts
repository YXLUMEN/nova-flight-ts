import {Entity} from "./Entity.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {Ownable} from "./Ownable.ts";
import {DataTracker, type DataTrackerBuilder} from "./data/DataTracker.ts";
import {TrackedDataHandlerRegistry} from "./data/TrackedDataHandlerRegistry.ts";
import {EntityTypes} from "./EntityTypes.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {ClusterRocketEntity} from "./projectile/ClusterRocketEntity.ts";
import type {ExplosionBehavior} from "../world/element/explosion/ExplosionBehavior.ts";
import {FilterBehaviour} from "../world/element/explosion/FilterBehaviour.ts";

export class TrailblazerEntity extends Entity implements Ownable {
    private static readonly BOMBS = DataTracker.registerData(Object(TrailblazerEntity), TrackedDataHandlerRegistry.VAR_UINT);

    private readonly owner: Entity | null;
    private readonly power: number;
    private readonly behaviour: ExplosionBehavior;

    private releaseCooldown = 6;

    public constructor(
        type: EntityType<TrailblazerEntity>,
        world: World,
        owner: Entity | null,
        power: number
    ) {
        super(type, world);
        this.noClip = true;
        this.power = power;
        this.owner = owner;
        this.behaviour = new FilterBehaviour(undefined, undefined, false)
            .withFiler(e => e !== owner);
    }

    protected defineSyncedData(builder: DataTrackerBuilder): void {
        builder.define(TrailblazerEntity.BOMBS, 12);
    }

    public tick() {
        super.tick();
        if (this.clampPosition()) return;

        if (!this.isClient()) {
            this.releaseBomb();
        }
        this.move(this.velocityRef);
    }

    private releaseBomb(): void {
        if (this.releaseCooldown-- > 0) return;
        this.releaseCooldown = 6;

        const count = this.getBombs();
        if (count <= 0) return;
        this.setBombs(count - 2);

        const world = this.getWorld() as ServerWorld;
        const yaw = this.getYaw();
        const speed = 8;

        const leftYaw = yaw - Math.PI / 4;
        const rightYaw = yaw + Math.PI / 4;

        const leftRocket = new ClusterRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner, this.power, 15, this.behaviour);
        leftRocket.setPositionByVec(this.positionRef);
        leftRocket.setVelocity(Math.cos(leftYaw) * speed, Math.sin(leftYaw) * speed);
        leftRocket.setYaw(yaw);

        const rightRocket = new ClusterRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner, this.power, 15, this.behaviour);
        rightRocket.setPositionByVec(this.positionRef);
        rightRocket.setVelocity(Math.cos(rightYaw) * speed, Math.sin(rightYaw) * speed);
        rightRocket.setYaw(yaw);

        world.spawnEntity(leftRocket);
        world.spawnEntity(rightRocket);
    }

    public setBombs(count: number): void {
        this.dataTracker.set(TrailblazerEntity.BOMBS, count);
    }

    public getBombs(): number {
        return this.dataTracker.get(TrailblazerEntity.BOMBS);
    }

    protected override getMapOffsetX(): number {
        return World.MAX_X_CROSS;
    }

    protected override getMapOffsetY(): number {
        return World.MAX_Y_CROSS;
    }

    protected override onOutOfBounds() {
        this.discard();
    }

    public canHitByProjectile() {
        return false;
    }

    public getOwner(): Entity | null {
        return this.owner;
    }

    public shouldSave(): boolean {
        return false;
    }

    public onDataTrackerUpdate(): void {
    }

    public onTrackedDataSet(): void {
    }
}