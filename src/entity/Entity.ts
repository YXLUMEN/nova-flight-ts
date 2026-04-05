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
import {AABB} from "../utils/math/AABB.ts";
import {clamp, doubleEquals, lerp, lerpRadians} from "../utils/math/math.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import type {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {Comparable, UUID} from "../type/types.ts";
import {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {VecDeltaCodec} from "./VecDeltaCodec.ts";
import type {PlayerEntity} from "./player/PlayerEntity.ts";
import type {CommandOutput} from "../server/command/CommandOutput.ts";
import {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {EntityLike} from "../world/entity/EntityLike.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";
import {IllegalArgumentError, IllegalStateException} from "../type/errors.ts";
import {NbtTypeId} from "../nbt/NbtType.ts";
import {EMPTY_LISTENER, type EntityChangeListener} from "../world/entity/EntityChangeListener.ts";
import type {EntityRenderer} from "../client/render/entity/EntityRenderer.ts";
import {BlockCollision} from "../world/collision/BlockCollision.ts";


export abstract class Entity implements EntityLike, DataTracked, Comparable, NbtSerializable, CommandOutput {
    private static readonly ENTITY_COUNTER = new AtomicInteger();
    private static readonly INITIAL_AABB = new AABB(0.0, 0.0, 0.0, 0.0);

    public invulnerable: boolean = false;
    public velocityDirty: boolean = false;
    public velocityModified: boolean = false;
    public prevX: number = 0;
    public prevY: number = 0;
    public prevYaw: number = 0;

    public noClip: boolean = false;
    public stuckTicks: number = -1;
    protected ejectCooldown = 0;

    private readonly dimensions: EntityDimensions;
    private boundingBox: AABB = Entity.INITIAL_AABB;

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
        this.dimensions = type.getDimensions();

        const builder = new DataTracker.Builder(this);
        this.defineSyncedData(builder);
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

    // 生命周期与状态管理

    public isRemoved(): boolean {
        return this.removed;
    }

    public isAlive(): boolean {
        return !this.isRemoved();
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

    public onDeath(_damageSource: DamageSource): void {
        this.discard();
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

    public getTags(): Set<string> {
        return this.tags;
    }

    public addTag(tag: string): boolean {
        if (this.tags.size >= 1024) return false;
        this.tags.add(tag);
        return true;
    }

    public removeTag(tag: string): boolean {
        return this.tags.delete(tag);
    }

    // 相等性与哈希

    public equals(other: unknown): boolean {
        if (other instanceof Entity) {
            return other.id === this.id
        }
        return false;
    }

    public hashCode(): string {
        return this.id.toString();
    }

    // 位置相关

    public get getPositionRef(): Readonly<MutVec2> {
        return this.position;
    }

    public getPosition(): Vec2 {
        return this.position.toImmut();
    }

    public getX(): number {
        return this.position.x;
    }

    public getY(): number {
        return this.position.y;
    }

    // 位置设置与更新

    // 允许离开地图边界的距离
    protected getMapOffsetX(): number {
        return 0;
    }

    protected getMapOffsetY(): number {
        return 0;
    }

    protected overwritePos(x: number, y: number): void {
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

    public snapTo(x: number, y: number, yaw: number): void {
        this.setPosition(x, y);
        this.setYaw(yaw);
        this.resetPrevious();
    }

    public updatePositionAndAngles(x: number, y: number, yaw: number, _interpolationSteps: number): void {
        this.setPosition(x, y);
        this.setYaw(yaw);
    }

    public resetPrevious() {
        this.prevX = this.getX();
        this.prevY = this.getY();
        this.prevYaw = this.getYaw();
    }

    public setDeltaMovement(x: number, y: number): void {
        this.positionDelta.setPos(x, y);
    }

    public getPositionDelta() {
        return this.positionDelta;
    }

    // 朝向 Yaw

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
        delta = Math.min(maxStep, Math.max(-maxStep, delta));
        this.setYaw(this.yaw + delta);
    }

    // 插值与渲染辅助

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

    // 速度与移动

    public get getVelocityRef(): MutVec2 {
        return this.velocity;
    }

    public getVelocity(): Vec2 {
        return this.velocity.toImmut();
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

    public updateVelocity(speed: number, x: number, y: number): void {
        const len = Math.hypot(x, y);
        if (len > 1E-6) {
            const nx = x / len;
            const ny = y / len;
            this.velocity.add(nx * speed, ny * speed);
        }
    }

    public updateVelocityByVec(speed: number, movementInput: IVec): void {
        if (movementInput.lengthSquared() < 1e-6) return;
        const dir = movementInput.length() > 1 ? movementInput.normalize() : movementInput;
        this.velocity.addVec(dir.multiply(speed));
    }

    public getMovementSpeed(): number {
        return this.movementSpeed;
    }

    public setMovementSpeed(speed: number): void {
        this.movementSpeed = speed;
    }

    // 移动控制

    public move(movement: IVec): void {
        if (this.noClip) {
            this.setPosition(this.position.x + movement.x, this.position.y + movement.y);
            return;
        }

        const adjusted = new MutVec2(movement.x, movement.y);
        this.adjustBlockCollision(adjusted);
        if (adjusted.lengthSquared() > 1E-7) {
            this.setPosition(this.position.x + adjusted.x, this.position.y + adjusted.y);
        }

        const cx = !doubleEquals(movement.x, adjusted.x, 1E-5);
        const cy = !doubleEquals(movement.y, adjusted.y, 1E-5);

        if (cx || cy) {
            this.setVelocity(cx ? 0 : this.velocity.x, cy ? 0 : this.velocity.y);
        }
    }

    protected adjustBlockCollision(movement: MutVec2): MutVec2 {
        const map = this.getWorld().getMap();
        const bounds = this.getBoundingBox();
        return BlockCollision.separatingCollision(map, bounds, movement);
    }

    protected adjustEntityCollision(movement: MutVec2): MutVec2 {
        if (this.noClip) return movement;

        const selfBox = this.getBoundingBox().stretchByVec(movement);
        const entities = this.getWorld().getEntityCollisions(this, selfBox);
        if (entities.length === 0) return movement;

        for (const entity of entities) {
            const otherBox = entity.getBoundingBox();

            const overlapX = Math.min(selfBox.maxX - otherBox.minX, otherBox.maxX - selfBox.minX);
            const overlapY = Math.min(selfBox.maxY - otherBox.minY, otherBox.maxY - selfBox.minY);

            if (overlapX < overlapY) {
                const sign = this.position.x < entity.position.x ? -1 : 1;
                movement.x = clamp(overlapX * sign, -movement.x, movement.x);
            } else {
                const sign = this.position.y < entity.position.y ? -1 : 1;
                movement.y = clamp(overlapY * sign, -movement.y, movement.y);
            }
        }
        return movement;
    }

    protected clampPosition(): boolean {
        const dim = this.dimensions;
        let x = this.position.x;
        let y = this.position.y;

        const ox = this.getMapOffsetX();
        const oy = this.getMapOffsetY();

        if (x < dim.halfWidth - ox) {
            x = dim.halfWidth;
            this.velocity.x = 0;
        }
        if (x > World.WORLD_W - dim.halfWidth + ox) {
            x = World.WORLD_W - dim.halfWidth;
            this.velocity.x = 0;
        }
        if (y < dim.halfHeight - oy) {
            y = dim.halfHeight;
            this.velocity.y = 0;
        }
        if (y > World.WORLD_H - dim.halfHeight + oy) {
            y = World.WORLD_H - dim.halfHeight;
            this.velocity.y = 0;
        }

        if (x !== this.position.x || y !== this.position.y) {
            this.onOutOfBounds(x, y);
            return true;
        }
        return false;
    }

    protected onOutOfBounds(x: number, y: number): void {
        this.overwritePos(x, y);
    }

    // 碰撞与尺寸

    public getWidth(): number {
        return this.dimensions.width;
    }

    public getHeight(): number {
        return this.dimensions.height;
    }

    public getDimensions(): EntityDimensions {
        return this.dimensions;
    }

    public getBoundingBox(): AABB {
        return this.boundingBox;
    }

    public setBoundingBox(boundingBox: AABB): void {
        this.boundingBox = boundingBox;
    }

    protected calculateBoundingBox(): AABB {
        return this.dimensions.getBoxAt(this.position.x, this.position.y);
    }

    public isCollisionTo(entity: Entity): boolean {
        return this.boundingBox.intersectsByBox(entity.getBoundingBox());
    }

    // 推挤行为

    public isPushAble(): boolean {
        return false;
    }

    public pushAwayFrom(entity: Entity): void {
        if (entity.noClip || this.noClip) return;

        let dx = entity.getX() - this.getX();
        let dy = entity.getY() - this.getY();
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) return;

        dx = (dx / dist) * 0.5;
        dy = (dy / dist) * 0.5;
        if (this.isPushAble()) {
            this.addVelocity(-dx, -dy);
        }
        if (entity.isPushAble()) {
            entity.addVelocity(dx, dy);
        }
    }

    // 伤害

    public isInvulnerableTo(damageSource: DamageSource): boolean {
        return this.removed || this.invulnerable && !damageSource.isIn();
    }

    /**
     * 和 isInvulnerableTo 不同,此方法使得实体免疫爆炸伤害以及后续效果
     *
     * @see{@link isInvulnerableTo}
     * */
    public isImmuneToExplosion() {
        return false;
    }

    public takeDamage(damageSource: DamageSource, _amount: number): boolean {
        return this.isInvulnerableTo(damageSource);
    }

    // 渲染与可见性

    public shouldRender(): boolean {
        return true;
    }

    /**
     * 是否可以成为"弹射物/射线"的目标
     * */
    public canHitByProjectile(): boolean {
        return this.isAlive();
    }

    // 网络同步

    public createSpawnPacket() {
        return EntitySpawnS2CPacket.create(this);
    }

    public onSpawnPacket(packet: EntitySpawnS2CPacket) {
        this.setDeltaMovement(packet.x, packet.y);
        this.snapTo(packet.x, packet.y, packet.yaw);
        this.setId(packet.entityId);
        this.setUuid(packet.uuid);
        this.color = packet.color;
        this.edgeColor = packet.edgeColor;
    }

    // 世界与环境

    public getWorld(): World {
        return this.world;
    }

    public isClient(): boolean {
        return this.world.isClient;
    }

    // 行为逻辑

    public isLogicalSide(): boolean {
        return this.canMoveVoluntarily();
    }

    public canMoveVoluntarily(): boolean {
        return !this.world.isClient;
    }

    public isPlayer(): this is PlayerEntity {
        return false;
    }

    // 数据追踪

    public getDataTracker(): DataTracker {
        return this.dataTracker;
    }

    public abstract onDataTrackerUpdate(entries: DataTrackerSerializedEntry<any>[]): void;

    public abstract onTrackedDataSet(data: TrackedData<any>): void;

    protected abstract defineSyncedData(builder: InstanceType<typeof DataTracker.Builder>): void;

    // 权限与命令

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

    // 变更监听
    public setChangeListener(listener: EntityChangeListener): void {
        this.changeListener = listener;
    }

    // 持久化

    public shouldSave(): boolean {
        return !this.removed;
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
            tags.forEach(tag => this.tags.add(tag));
        }
    }

    // 仅限清理. 用别怕,怕别用
    public static resetCounter() {
        this.ENTITY_COUNTER.reset();
    }

    // 用于缓存,渲染器自动处理,一般不需要手动管理
    public renderer: EntityRenderer<Entity> | null = null;
}