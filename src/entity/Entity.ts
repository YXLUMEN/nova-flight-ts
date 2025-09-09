import {MutVec2} from "../utils/math/MutVec2.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import {World} from "../world/World.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {EntityType} from "./EntityType.ts";
import type {EntityDimensions} from "./EntityDimensions.ts";
import {DataTracker} from "./data/DataTracker.ts";
import type {DataTracked} from "./data/DataTracked.ts";
import type {DataEntry} from "./data/DataEntry.ts";
import {AtomicInteger} from "../utils/math/AtomicInteger.ts";
import {EVENTS} from "../apis/IEvents.ts";
import type {IVec} from "../utils/math/IVec.ts";


export abstract class Entity implements DataTracked {
    public invulnerable: boolean = false;
    protected readonly dataTracker: DataTracker;

    private static readonly CURRENT_ID = new AtomicInteger();

    private readonly type: EntityType<any>
    private readonly world: World;

    private movementSpeed: number = 5;
    private readonly pos: MutVec2;
    private readonly velocity: MutVec2 = MutVec2.zero();
    private yaw: number = 0;

    private readonly dimensions: EntityDimensions;
    private removed: boolean = false;

    private readonly id: number = Entity.CURRENT_ID.incrementAndGet();

    protected constructor(type: EntityType<any>, world: World) {
        this.type = type;
        this.world = world;

        this.pos = MutVec2.zero();
        this.dimensions = type.getDimensions();

        const builder = new DataTracker.Builder(this);
        this.initDataTracker(builder);
        this.dataTracker = builder.build();
    }

    public getType(): EntityType<any> {
        return this.type;
    }

    public getId(): number {
        return this.id;
    }

    public tick(): void {
    }

    public move(x: number, y: number): void {
        this.pos.add(x, y);
    }

    public moveByVec(vec: IVec): void {
        this.move(vec.x, vec.y);
    }

    public getWorld(): World {
        return this.world;
    }

    public isInvulnerableTo(damageSource: DamageSource): boolean {
        return this.removed || this.invulnerable && !damageSource.isIn();
    }

    public takeDamage(damageSource: DamageSource, _amount: number): boolean {
        return this.isInvulnerableTo(damageSource);
    }

    public onDeath(_damageSource: DamageSource): void {
        this.discard();
    }

    public discard(): void {
        this.removed = true;
        this.world.events.emit(EVENTS.ENTITY_REMOVED, {entity: this});
    }

    public isRemoved(): boolean {
        return this.removed;
    }

    public getEntityDimension(): EntityDimensions {
        return this.dimensions;
    }

    public calculateBoundingBox() {
        return this.dimensions.getBoxAtByVec(this.pos);
    }

    public setPositionByVec(pos: IVec): void {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
    }

    public setPosition(x: number, y: number): void {
        this.pos.x = x;
        this.pos.y = y;
    }

    public get getMutPosition(): MutVec2 {
        return this.pos;
    }

    public getPosition(): Vec2 {
        return Vec2.formVec(this.pos);
    }

    public updateVelocity(speed: number, x: number, y: number): void {
        this.setVelocityByVec(this.velocity.set(x * speed, y * speed));
    }

    public updateVelocityByVec(speed: number, movementInput: IVec): void {
        this.updateVelocity(speed, movementInput.x, movementInput.y);
    }

    public getMovementSpeed() {
        return this.movementSpeed;
    }

    public setMovementSpeed(speed: number): void {
        this.movementSpeed = speed | 0;
    }

    public get getMutVelocity(): MutVec2 {
        return this.velocity;
    }

    public getVelocity(): Vec2 {
        return Vec2.formVec(this.velocity);
    }

    public setVelocityByVec(velocity: IVec): void {
        this.velocity.set(velocity.x, velocity.y);
    }

    public setVelocity(x: number, y: number): void {
        this.velocity.set(x, y);
    }

    public getYaw(): number {
        return this.yaw
    }

    public setYaw(yaw: number): void {
        this.yaw = yaw;
    }

    public setClampYaw(target: number, maxStep: number = 0.0785375): void {
        let delta = target - this.yaw;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));

        if (delta > maxStep) delta = maxStep;
        if (delta < -maxStep) delta = -maxStep;

        this.yaw += delta;
    }

    public abstract onDataTrackerUpdate(entries: DataEntry<any>): void;

    public abstract onTrackedDataSet(data: TrackedData<any>): void;

    protected abstract initDataTracker(builder: InstanceType<typeof DataTracker.Builder>): void;
}