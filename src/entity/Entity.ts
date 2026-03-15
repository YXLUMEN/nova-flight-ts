import {MutVec2} from "../utils/math/MutVec2.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import {World} from "../world/World.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {EntityType} from "./EntityType.ts";
import type {EntityDimensions} from "./EntityDimensions.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "./data/DataTracker.ts";
import type {DataTracked} from "./data/DataTracked.ts";
import {AtomicInteger} from "../utils/collection/AtomicInteger.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {Box} from "../utils/math/Box.ts";
import {clamp, doubleEquals, lerp, lerpRadians} from "../utils/math/math.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import type {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {Comparable, UUID} from "../apis/types.ts";
import {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {VecDeltaCodec} from "./VecDeltaCodec.ts";
import type {PlayerEntity} from "./player/PlayerEntity.ts";
import type {CommandOutput} from "../server/command/CommandOutput.ts";
import {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {EntityLike} from "../world/entity/EntityLike.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";
import {IllegalArgumentError, IllegalStateException} from "../apis/errors.ts";
import {NbtTypeId} from "../nbt/NbtType.ts";
import {EMPTY_LISTENER, type EntityChangeListener} from "../world/entity/EntityChangeListener.ts";
import type {EntityRenderer} from "../client/render/entity/EntityRenderer.ts";
import {BlockCollision} from "../world/collision/BlockCollision.ts";


export abstract class Entity implements EntityLike, DataTracked, Comparable, NbtSerializable, CommandOutput {
    private static readonly ENTITY_COUNTER = new AtomicInteger();
    private static readonly NULL_BOX = new Box(0.0, 0.0, 0.0, 0.0);

    public invulnerable: boolean = false;
    public velocityDirty: boolean = false;
    public velocityModified: boolean = false;
    public prevX: number = 0;
    public prevY: number = 0;
    public prevYaw: number = 0;

    public noClip: boolean = false;
    public noColliesToEntity: boolean = false;

    private readonly dimensions: EntityDimensions;
    private boundingBox: Box = Entity.NULL_BOX;

    public age: number = 0;

    public color = '';
    public edgeColor = '';

    private readonly type: EntityType<any>;
    private uuid: UUID = crypto.randomUUID();
    private id: number = Entity.ENTITY_COUNTER.incrementAndGet();

    private readonly world: World;
    protected readonly dataTracker: DataTracker;

    private readonly position: MutVec2;
    private readonly positionDelta = new VecDeltaCodec();

    private readonly velocity: MutVec2 = MutVec2.zero();
    private movementSpeed: number = 0.2;
    private yaw: number = 0;

    private changeListener: EntityChangeListener = EMPTY_LISTENER;

    private readonly tags: Set<string> = new Set<string>();
    private removed: boolean = false;

    protected constructor(type: EntityType<any>, world: World) {
        this.type = type;
        this.world = world;

        this.position = MutVec2.zero();
        this.prevX = 0;
        this.prevY = 0;
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

    public setId(id: number): void {
        this.id = id;
    }

    public getUUID(): UUID {
        return this.uuid;
    }

    public setUuid(uuid: UUID): void {
        this.uuid = uuid;
    }

    public tick(): void {
    }

    /**
     * 禁止重写
     *
     * 如需清理工作, 考虑 onDiscard
     * @see onDiscard
     * */
    public discard(): void {
        if (this.removed) return;
        this.removed = true;
        this.onDiscard();
        this.changeListener.remove();
    }

    /**
     * 用于丢弃后的清理, 必须保证清除有效
     */
    protected onDiscard(): void {
    }

    public kill(): void {
        const damage = this.getWorld().getDamageSources().kill();
        this.onDeath(damage);
    }

    public getTags(): Set<string> {
        return this.tags;
    }

    public addTag(tag: string): boolean {
        if (this.tags.size > 1024) return false;
        this.tags.add(tag);
        return true;
    }

    public removeTag(tag: string): boolean {
        return this.tags.delete(tag);
    }

    public equals(other: unknown): boolean {
        if (other instanceof Entity) {
            return other.id === this.id
        }
        return false;
    }

    public hashCode(): string {
        return this.id.toString();
    }

    public get getPositionRef(): Readonly<MutVec2> {
        return this.position;
    }

    public getPosition(): Vec2 {
        return this.position.toImmutable();
    }

    public getX(): number {
        return this.position.x;
    }

    public getY(): number {
        return this.position.y;
    }

    public overwritePos(x: number, y: number): void {
        if (this.position.x === x && this.position.y === y) return;
        this.position.set(x, y);
    }

    public setPosition(x: number, y: number): void {
        if (this.position.x === x && this.position.y === y) return;
        this.position.set(x, y);
        this.changeListener.updateEntityPosition();
        this.setBoundingBox(this.calculateBoundingBox());
    }

    public setPositionByVec(pos: IVec): void {
        this.setPosition(pos.x, pos.y);
    }

    public updatePosition(x: number, y: number): void {
        const d = clamp(x, -3.0E7, 3.0E7);
        const e = clamp(y, -3.0E7, 3.0E7);
        this.prevX = d;
        this.prevY = e;
        this.setPosition(d, e);
    }

    public syncPositionDelta(x: number, y: number): void {
        this.positionDelta.setPos(x, y);
    }

    public resetPrevious() {
        this.prevX = this.getX();
        this.prevY = this.getY();
        this.prevYaw = this.getYaw();
    }

    public refreshPositionAndAngles(x: number, y: number, yaw: number): void {
        this.setPosition(x, y);
        this.setYaw(yaw);
        this.resetPrevious();
    }

    public getPositionDelta() {
        return this.positionDelta;
    }

    public updatePositionAndAngles(x: number, y: number, yaw: number, _interpolationSteps: number): void {
        this.setPosition(x, y);
        this.setYaw(yaw);
    }

    public getYaw(): number {
        return this.yaw;
    }

    public setYaw(yaw: number): void {
        if (Number.isFinite(yaw)) {
            this.yaw = yaw;
        } else {
            console.warn(`Invalid entity rotation: ${yaw}, discarding.`);
        }
    }

    public updateYaw(yaw: number): void {
        this.yaw = yaw;
        this.prevYaw = yaw;
    }

    public setClampYaw(target: number, maxStep: number = 0.0785375): void {
        let delta = target - this.yaw;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));

        if (delta > maxStep) delta = maxStep;
        if (delta < -maxStep) delta = -maxStep;

        this.setYaw(this.yaw + delta);
    }

    public get getVelocityRef(): MutVec2 {
        return this.velocity;
    }

    public getVelocity(): Vec2 {
        return this.velocity.toImmutable();
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

    public setVelocity(x: number, y: number): void {
        this.velocity.set(x, y);
    }

    public setVelocityByVec(velocity: IVec): void {
        this.setVelocity(velocity.x, velocity.y);
    }

    public setVelocityClient(x: number, y: number): void {
        this.setVelocity(x, y);
    }

    public addVelocity(deltaX: number, deltaY: number): void {
        this.setVelocity(this.velocity.x + deltaX, this.velocity.y + deltaY);
        this.velocityDirty = true;
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

    public isCollisionTo(entity: Entity): boolean {
        return this.boundingBox.intersectsByBox(entity.getBoundingBox());
    }

    public getBoundingBox(): Box {
        return this.boundingBox;
    }

    public setBoundingBox(boundingBox: Box): void {
        this.boundingBox = boundingBox;
    }

    protected calculateBoundingBox(): Box {
        return this.dimensions.getBoxAt(this.position.x, this.position.y);
    }

    public createSpawnPacket() {
        return EntitySpawnS2CPacket.create(this);
    }

    public onSpawnPacket(packet: EntitySpawnS2CPacket) {
        this.syncPositionDelta(packet.x, packet.y);
        this.refreshPositionAndAngles(packet.x, packet.y, packet.yaw);
        this.setId(packet.entityId);
        this.setUuid(packet.uuid);
        this.color = packet.color;
        this.edgeColor = packet.edgeColor;
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

    public getLerpPos(tickDelta: number): MutVec2 {
        const x = lerp(tickDelta, this.prevX, this.getX());
        const y = lerp(tickDelta, this.prevY, this.getY());
        return new MutVec2(x, y);
    }

    public getLerpTargetX() {
        return this.getX();
    }

    public getLerpTargetY() {
        return this.getY();
    }

    public getLerpTargetYaw() {
        return this.getYaw();
    }

    public getLerpYaw(tickDelta: number): number {
        return tickDelta === 1.0 ? this.yaw : lerp(tickDelta, this.prevYaw, this.yaw);
    }

    protected lerpPosAndYaw(step: number, x: number, y: number, yaw: number): void {
        const t = 1 / step;
        const dx = lerp(t, this.getX(), x);
        const dy = lerp(t, this.getY(), y);
        const dYaw = lerpRadians(t, this.getYaw(), yaw);
        this.setPosition(dx, dy);
        this.setYaw(dYaw);
    }

    public move(movement: IVec): void {
        if (this.noClip) {
            this.setPosition(this.position.x + movement.x, this.position.y + movement.y);
            return;
        }

        const withBlock = this.adjustBlockCollision(movement);
        const cx = !doubleEquals(movement.x, withBlock.x, 1E-5);
        const cy = !doubleEquals(movement.y, withBlock.y, 1E-5);

        if (cx || cy) {
            this.setVelocity(cx ? 0 : this.velocity.x, cy ? 0 : this.velocity.y);
        }

        const withEntity = this.adjustEntityCollision(withBlock);
        if (withEntity.lengthSquared() > 1E-7) {
            this.setPosition(this.position.x + withEntity.x, this.position.y + withEntity.y);
        }
    }

    protected adjustBlockCollision(movement: IVec): IVec {
        const map = this.getWorld().getMap();
        const bounds = this.getBoundingBox();
        if (map.intersectsBox(bounds)) return movement;

        return BlockCollision.separatingCollision(map, bounds, movement);
    }

    private adjustEntityCollision(movement: IVec): IVec {
        if (this.noColliesToEntity) return movement;

        const selfBox = this.getBoundingBox().stretchByVec(movement);
        const entities = this.getWorld().getEntityCollisions(this, selfBox);
        if (entities.length === 0) return movement;

        const adjusted = movement.toMut();
        for (const entity of entities) {
            const otherBox = entity.getBoundingBox();

            const overlapX = Math.min(selfBox.maxX - otherBox.minX, otherBox.maxX - selfBox.minX);
            const overlapY = Math.min(selfBox.maxY - otherBox.minY, otherBox.maxY - selfBox.minY);

            if (overlapX < overlapY) {
                const sign = this.position.x < entity.position.x ? -1 : 1;
                adjusted.x = clamp(overlapX * sign, -adjusted.x, adjusted.x);
            } else {
                const sign = this.position.y < entity.position.y ? -1 : 1;
                adjusted.y = clamp(overlapY * sign, -adjusted.y, adjusted.y);
            }
        }
        return adjusted;
    }

    protected adjustPosition(): boolean {
        const dim = this.dimensions;
        let x = this.position.x;
        let y = this.position.y;

        if (x < dim.halfWidth) {
            x = dim.halfWidth;
            this.velocity.x = 0;
        }
        if (x > World.WORLD_W - dim.halfWidth) {
            x = World.WORLD_W - dim.halfWidth;
            this.velocity.x = 0;
        }
        if (y < dim.halfHeight) {
            y = dim.halfHeight;
            this.velocity.y = 0;
        }
        if (y > World.WORLD_H - dim.halfHeight) {
            y = World.WORLD_H - dim.halfHeight;
            this.velocity.y = 0;
        }

        this.overwritePos(x, y);
        return true;
    }

    public setChangeListener(listener: EntityChangeListener): void {
        this.changeListener = listener;
    }

    public shouldSave(): boolean {
        return !this.removed;
    }

    public isLogicalSideForUpdatingMovement(): boolean {
        return this.canMoveVoluntarily();
    }

    public canMoveVoluntarily(): boolean {
        return !this.world.isClient;
    }

    public isPlayer(): this is PlayerEntity {
        return false;
    }

    public getDataTracker(): DataTracker {
        return this.dataTracker;
    }

    public shouldRender(): boolean {
        return true;
    }

    public getCommandSource(): ServerCommandSource {
        const serverWorld = this.getWorld();
        return new ServerCommandSource(
            this,
            this.getPosition(),
            this.getYaw(),
            serverWorld.isClient ? null : (serverWorld as ServerWorld),
            this.getPermissionLevel(),
            'Entity',
            'Entity',
            serverWorld.getServer()!,
            this
        );
    }

    protected getPermissionLevel(): number {
        return 0;
    }

    public hasPermissionLevel(permissionLevel: number): boolean {
        return this.getPermissionLevel() >= permissionLevel;
    }

    public sendMessage(_msg: string): void {
    }

    public sendTranslatable(_key: string, _args?: string[]) {
    }

    public shouldTrackOutput(): boolean {
        return true;
    }

    public cannotBeSilenced(): boolean {
        return false;
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        try {
            nbt.putDoubleArray('pos', [this.position.x, this.position.y]);
            nbt.putFloatArray('velocity', [this.velocity.x, this.velocity.y]);

            nbt.putDouble('yaw', this.yaw);
            nbt.putDouble('speed', this.movementSpeed);
            nbt.putBoolean('invulnerable', this.invulnerable);
            nbt.putString('uuid', this.uuid);

            if (this.tags.size > 0) {
                nbt.putStringArray('tags', Array.from(this.tags));
            }
            return nbt;
        } catch (err) {
            console.error(`Error when write Entity NBT: ${err}`);
            throw err;
        }
    }

    public readNBT(nbt: NbtCompound): void {
        const posNbt = nbt.getDoubleArray('pos');
        this.setPosition(
            clamp(posNbt[0] ?? 0, -3E7, 3E7),
            clamp(posNbt[1] ?? 0, -3E7, 3E7),
        );
        const velocity = nbt.getFloatArray('velocity');
        this.setVelocity(
            clamp(velocity[0] ?? 0, -1E3, 1E3),
            clamp(velocity[1] ?? 0, -1E3, 1E3)
        );
        this.setYaw(nbt.getDouble('yaw'));
        this.resetPrevious();

        this.setMovementSpeed(nbt.getDouble('speed'));
        this.invulnerable = nbt.getBoolean('invulnerable', 0);

        if (nbt.contains('uuid', NbtTypeId.String)) {
            const uuid = nbt.getString('uuid');
            if (!UUIDUtil.isValidUUID(uuid)) throw new IllegalArgumentError('Invalid UUID format.');
            this.uuid = uuid;
        }

        if (!Number.isFinite(this.getX()) || !Number.isFinite(this.getY())) {
            throw new IllegalStateException('Entity has invalid position');
        }
        if (!Number.isFinite(this.getYaw())) {
            throw new IllegalArgumentError('Entity has invalid rotation');
        }

        const tags = nbt.getStringArray('tags');
        if (tags.length > 0) {
            this.tags.clear();
            for (const tag of tags) {
                this.tags.add(tag);
            }
        }
    }

    public abstract onDataTrackerUpdate(entries: DataTrackerSerializedEntry<any>[]): void;

    public abstract onTrackedDataSet(data: TrackedData<any>): void;

    protected abstract initDataTracker(builder: InstanceType<typeof DataTracker.Builder>): void;

    // 仅限清理. 用别怕,怕别用
    public static resetCounter() {
        this.ENTITY_COUNTER.reset();
    }

    // 用于缓存,渲染器自动处理,一般不需要手动管理
    public renderer: EntityRenderer<Entity> | null = null;
}