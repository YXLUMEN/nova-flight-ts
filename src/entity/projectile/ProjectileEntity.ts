import type {Ownable} from "../Ownable.ts";
import type {EntityType} from "../EntityType.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {type HitResult, HitType} from "../../world/collision/HitResult.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {UUID} from "../../type/types.ts";
import type {DataTrackerBuilder, DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {ProjectRaycastUtil} from "../../world/collision/ProjectRaycastUtil.ts";
import {ExtraCodec} from "../../serialization/ExtraCodec.ts";
import {Codecs} from "../../serialization/Codecs.ts";

export abstract class ProjectileEntity extends Entity implements Ownable {
    private damage: number = 0;
    private ownerUuid: UUID | null = null;
    private owner: Entity | null = null;

    protected constructor(
        type: EntityType<ProjectileEntity>,
        world: World,
        owner: Entity | null = null,
        damage: number = 0,
    ) {
        super(type, world);

        this.damage = damage;
        this.setOwner(owner);
    }

    public override tick() {
        super.tick();

        if (this.clampPosition()) return;

        const pos = this.positionRef;
        const velocity = this.velocityRef;
        const hitResult = ProjectRaycastUtil.getCollision(
            this,
            entity => this.canHit(entity),
            this.getWidth()
        );
        if (hitResult.getType() !== HitType.MISS) {
            this.onCollision(hitResult);
        }
        this.setPosition(pos.x + velocity.x, pos.y + velocity.y);
    }

    public override isImmuneToExplosion() {
        return true;
    }

    public override canHitByProjectile(): boolean {
        return false;
    }

    public canHit(entity: Entity): boolean {
        return entity.canHitByProjectile() && entity !== this.getOwner();
    }

    public onCollision(hitResult: HitResult) {
        if (hitResult.getType() === HitType.ENTITY) {
            this.onEntityHit(hitResult as EntityHitResult);
        } else if (hitResult.getType() === HitType.BLOCK) {
            this.onBlockHit(hitResult as BlockHitResult);
        }
    }

    protected onEntityHit(_hitResult: EntityHitResult): void {
        if (this.isClient()) return;
        this.discard();
    }

    protected onBlockHit(_hitResult: BlockHitResult): void {
        if (this.isClient()) return;
        this.discard();
    }

    public onIntercept(_damage: number, _source: DamageSource): void {
        this.discard();
    }

    public getHitDamage(): number {
        return this.damage;
    }

    public setOwner(entity: Entity | null): void {
        if (entity) {
            this.ownerUuid = entity.getUUID();
            this.owner = entity;
        }
    }

    public getOwner(): Entity | null {
        if (this.owner && !this.owner.isRemoved()) {
            return this.owner;
        }
        const world = this.getWorld() as ServerWorld;
        if (this.ownerUuid && !world.isClient) {
            this.owner = world.getEntity(this.ownerUuid);
            return this.owner;
        }
        return null;
    }

    public override setVelocity(x: number, y: number) {
        super.setVelocity(x, y);
        this.needSync = true;
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

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        super.onSpawnPacket(packet);
        this.setVelocity(packet.velocityX, packet.velocityY);
        const owner = this.getWorld().getEntityById(packet.entityData);
        if (owner) this.setOwner(owner);
    }

    public override createSpawnPacket(): EntitySpawnS2CPacket {
        const ownerId = this.getOwner()?.getId() ?? 0;
        return EntitySpawnS2CPacket.create(this, ownerId);
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        if (this.ownerUuid) {
            nbt.store('owner', ExtraCodec.UUID, this.ownerUuid);
        }

        nbt.setFloat('damage', this.damage);
        nbt.store('colors', ExtraCodec.ENTITY_COLOR, this.color);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);

        this.ownerUuid = nbt.read('owner', ExtraCodec.UUID).getOrNull();
        nbt.read('damage', Codecs.NUMBER).ifPresent(v => this.damage = v);
        nbt.read('colors', ExtraCodec.ENTITY_COLOR).ifPresent(v => this.color = v);
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected isOwner(entity: Entity) {
        return entity.getUUID() === this.ownerUuid;
    }

    protected defineSyncedData(_builder: DataTrackerBuilder): void {
    }

    protected override changeColor() {
        this.color.color = '#8cf5ff';
    }
}