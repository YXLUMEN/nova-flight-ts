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
import type {Box} from "../utils/math/Box.ts";
import type {Comparable} from "../utils/collection/HashMap.ts";
import {clamp, shortUUID} from "../utils/math/math.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import type {NbtCompound} from "../nbt/NbtCompound.ts";


export abstract class Entity implements DataTracked, Comparable, NbtSerializable {
    // 除了全局EntityList, 禁止使用
    public static readonly CURRENT_ID = new AtomicInteger();

    public invulnerable: boolean = false;

    protected readonly dataTracker: DataTracker;
    private uuid = shortUUID();
    private readonly id: number = Entity.CURRENT_ID.incrementAndGet();
    private readonly normalTags: Set<string> = new Set<string>();

    private readonly type: EntityType<any>;
    private readonly world: World;

    private readonly pos: MutVec2;
    private readonly velocity: MutVec2 = MutVec2.zero();
    private movementSpeed: number = 5;
    private yaw: number = 0;

    private readonly dimensions: EntityDimensions;
    private removed: boolean = false;

    public age: number = 0;

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

    public setUuid(uuid: string): void {
        this.uuid = uuid;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public isPlayer() {
        return false;
    }

    public getNormalTags(): Set<string> {
        return this.normalTags;
    }

    public addNormalTag(tag: string): boolean {
        if (this.normalTags.size > 1024) return false;
        this.normalTags.add(tag);
        return true;
    }

    public removeNormalTag(tag: string): boolean {
        return this.normalTags.delete(tag);
    }

    /**
     * 禁止重写
     *
     * 如需清理工作, 考虑 onRemove
     * @see onRemove
     * */
    public discard(): void {
        if (this.removed) return;
        this.removed = true;
        this.onRemove();
        this.world.events.emit(EVENTS.ENTITY_REMOVED, {entity: this});
    }

    public onRemove() {
    }

    protected abstract initDataTracker(builder: InstanceType<typeof DataTracker.Builder>): void;

    public getDataTracker(): DataTracker {
        return this.dataTracker;
    }

    public equals(other: Object): boolean {
        if (other instanceof Entity) {
            return other.id === this.id
        }
        return false;
    }

    public hashCode(): string {
        return this.id.toString();
    }

    public setPosition(x: number, y: number): void {
        this.pos.x = x;
        this.pos.y = y;
    }

    public setPositionByVec(pos: IVec): void {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
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

    public getWidth(): number {
        return this.dimensions.width;
    }

    public getHeight(): number {
        return this.dimensions.height;
    }

    public calculateBoundingBox(): Box {
        return this.dimensions.getBoxAtByVec(this.pos);
    }

    public tick(): void {
    }

    public updateVelocityByVec(speed: number, movementInput: IVec): void {
        if (movementInput.lengthSquared() < 1e-6) return;
        const dir = movementInput.length() > 1 ? movementInput.normalize() : movementInput;
        this.velocity.addVec(dir.multiply(speed));
    }

    public updateVelocity(speed: number, x: number, y: number): void {
        const len = Math.hypot(x, y);
        if (len > 1E-6) {
            const nx = x / len;
            const ny = y / len;
            this.velocity.add(nx * speed, ny * speed);
        }
    }

    public moveByVec(vec: IVec): void {
        this.move(vec.x, vec.y);
    }

    public move(x: number, y: number): void {
        this.pos.add(x, y);
    }

    protected adjustPosition(): boolean {
        const pos = this.pos;
        pos.x = clamp(pos.x, 20, World.W - 20);
        pos.y = clamp(pos.y, 20, World.H - 20);
        return true;
    }

    public get getPositionRef(): MutVec2 {
        return this.pos;
    }

    public getPosition(): Vec2 {
        return this.pos.toImmutable();
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

    public isRemoved(): boolean {
        return this.removed;
    }

    public getMovementSpeed(): number {
        return this.movementSpeed;
    }

    public setMovementSpeed(speed: number): void {
        this.movementSpeed = speed;
    }

    public get getVelocityRef(): MutVec2 {
        return this.velocity;
    }

    public getVelocity(): Vec2 {
        return this.velocity.toImmutable();
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

    public writeNBT(nbt: NbtCompound): NbtCompound {
        try {
            const pos = this.pos;
            nbt.putNumberArray('Pos', pos.x, pos.y);

            const velocity = this.velocity;
            nbt.putNumberArray('Velocity', velocity.x, velocity.y);
            nbt.putDouble('Yaw', this.yaw);
            nbt.putBoolean('Invulnerable', this.invulnerable);
            nbt.putString('UUID', this.uuid);

            if (this.normalTags.size > 0) {
                nbt.putStringArray('Tags', ...this.normalTags);
            }

            return nbt;
        } catch (err) {
            console.error(`Error when write Entity NBT: ${err}`);
            throw err;
        }
    }

    public readNBT(nbt: NbtCompound): void {
        try {
            const posNbt = nbt.getNumberArray('Pos');
            this.setPosition(posNbt[0], posNbt[1]);

            const velocity = nbt.getNumberArray('Velocity');
            this.setVelocity(velocity[0], velocity[1]);
            this.setYaw(nbt.getDouble('Yaw'));
            this.invulnerable = nbt.getBoolean('Invulnerable');
            this.uuid = nbt.getString('UUID');

            const tags = nbt.getStringArray('Tags');
            if (tags.length > 0) {
                this.normalTags.clear();
                for (const tag of tags) {
                    this.normalTags.add(tag);
                }
            }
        } catch (err) {
            console.error(`Error when readNBT: ${err}`);
            throw err;
        }
    }

    public abstract onDataTrackerUpdate(entries: DataEntry<any>): void;

    public abstract onTrackedDataSet(data: TrackedData<any>): void;
}