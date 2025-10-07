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
import {clamp, lerp} from "../utils/math/math.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import type {NbtCompound} from "../nbt/NbtCompound.ts";
import type {UUID} from "../apis/registry.ts";
import {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";


export abstract class Entity implements DataTracked, Comparable, NbtSerializable {
    // 除了全局EntityList, 禁止使用
    public static readonly CURRENT_ID = new AtomicInteger();

    public invulnerable: boolean = false;

    protected readonly dataTracker: DataTracker;
    private uuid: UUID = crypto.randomUUID();
    private id: number = Entity.CURRENT_ID.incrementAndGet();
    private readonly normalTags: Set<string> = new Set<string>();

    private readonly type: EntityType<any>;
    private readonly world: World;

    private readonly pos: MutVec2;
    private preX: number = 0;
    private preY: number = 0;

    private readonly velocity: MutVec2 = MutVec2.zero();
    private movementSpeed: number = 0.2;
    private yaw: number = 0;
    private preYaw: number = 0;

    private readonly dimensions: EntityDimensions;
    private removed: boolean = false;

    public age: number = 0;
    public color = '';
    public edgeColor = '';

    protected constructor(type: EntityType<any>, world: World) {
        this.type = type;
        this.world = world;

        this.pos = MutVec2.zero();
        this.preX = 0;
        this.preY = 0;
        this.dimensions = type.getDimensions();

        const builder = new DataTracker.Builder(this);
        this.initDataTracker(builder);
        this.dataTracker = builder.build();
    }

    public getType(): EntityType<any> {
        return this.type;
    }

    public setId(id: number): void {
        this.id = id;
    }

    public getId(): number {
        return this.id;
    }

    public setUuid(uuid: UUID): void {
        this.uuid = uuid;
    }

    public getUuid(): UUID {
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

    public updatePosAndYaw(): void {
        this.preYaw = this.yaw;
        this.preX = this.getX();
        this.preY = this.getY();
    }

    public setPosition(x: number, y: number): void {
        if (this.pos.x !== x || this.pos.y !== y) {
            this.preX = this.pos.x;
            this.preY = this.pos.y;
            this.pos.set(x, y);
        }
    }

    public setPositionByVec(pos: IVec): void {
        this.setPosition(pos.x, pos.y);
    }

    public setYaw(yaw: number): void {
        this.preYaw = this.yaw;
        this.yaw = yaw;
    }

    public setClampYaw(target: number, maxStep: number = 0.0785375): void {
        let delta = target - this.yaw;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));

        if (delta > maxStep) delta = maxStep;
        if (delta < -maxStep) delta = -maxStep;

        this.setYaw(this.yaw + delta);
    }

    public createSpawnPacket() {
        return EntitySpawnS2CPacket.create(this);
    }

    public onSpawnPacket(packet: EntitySpawnS2CPacket) {
        this.setId(packet.entityId);
        this.setUuid(packet.uuid);
        this.setPosition(packet.x, packet.y);
        this.setVelocity(packet.velocityX, packet.velocityY);
        this.setYaw(packet.yaw);
        this.color = packet.color;
        this.edgeColor = packet.edgeColor;
    }

    public getWidth(): number {
        return this.dimensions.width;
    }

    public getHeight(): number {
        return this.dimensions.height;
    }

    public getDimensions(): EntityDimensions {
        return this.dimensions;
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
        this.setPosition(this.pos.x + x, this.pos.y + y);
    }

    protected adjustPosition(): boolean {
        const pos = this.pos;
        pos.x = clamp(pos.x, 20, World.WORLD_W - 20);
        pos.y = clamp(pos.y, 20, World.WORLD_H - 20);
        return true;
    }

    protected wrapPosition(): boolean {
        const pos = this.getPositionRef;
        const W = World.WORLD_W;

        this.setPosition(((pos.x % W) + W) % W, clamp(pos.y, 20, World.WORLD_H - 20));
        return true;
    }

    public shouldWrap(): boolean {
        return false;
    }

    public get getPositionRef(): Readonly<MutVec2> {
        return this.pos;
    }

    public getPosition(): Vec2 {
        return this.pos.toImmutable();
    }

    public getX(): number {
        return this.pos.x;
    }

    public getY(): number {
        return this.pos.y;
    }

    public getLerpPos(tickDelta: number): MutVec2 {
        const x = lerp(tickDelta, this.preX, this.getX());
        const y = lerp(tickDelta, this.preY, this.getY());
        return new MutVec2(x, y);
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

    public isAlive(): boolean {
        return !this.isRemoved();
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
        return this.yaw;
    }

    public getLerpYaw(tickDelta: number): number {
        return tickDelta === 1.0 ? this.yaw : lerp(tickDelta, this.preYaw, this.yaw);
    }

    public shouldSave(): boolean {
        return true;
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        try {
            const pos = this.pos;
            nbt.putNumberArray('Pos', pos.x, pos.y);

            const velocity = this.velocity;
            nbt.putNumberArray('Velocity', velocity.x, velocity.y);
            nbt.putDouble('Yaw', this.yaw);
            nbt.putDouble('Speed', this.movementSpeed);
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
            this.setMovementSpeed(nbt.getDouble('Speed'));
            this.invulnerable = nbt.getBoolean('Invulnerable', false);
            this.uuid = nbt.getString('UUID') as UUID;

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