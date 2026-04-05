import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import type {IOwnable} from "../IOwnable.ts";
import type {EntityType} from "../EntityType.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {type NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {IColorEntity} from "../IColorEntity.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {UUID} from "../../type/types.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";
import {decodeColorToHex, encodeColorHex} from "../../utils/NetUtil.ts";
import {ProjectRaycastUtil} from "../../world/collision/ProjectRaycastUtil.ts";
import {type HitResult, HitTypes} from "../../world/collision/HitResult.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable, IColorEntity {
    private damage: number = 0;
    public color: string = "#8cf5ff";
    public edgeColor: string = '';
    private ownerUuid: UUID | null = null;
    private owner: Entity | null = null;

    protected constructor(type: EntityType<ProjectileEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world);

        this.damage = damage;
        this.setOwner(owner);
    }

    public override tick() {
        super.tick();

        if (this.clampPosition()) return;

        const pos = this.getPositionRef;
        const velocity = this.getVelocityRef;
        const hitResult = ProjectRaycastUtil.getCollision(
            this,
            entity => this.canHit(entity),
            this.getWidth()
        );
        if (hitResult.getType() !== HitTypes.MISS) {
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
        if (!entity.canHitByProjectile()) return false;
        return entity !== this.getOwner();
    }

    public onCollision(hitResult: HitResult) {
        if (hitResult.getType() === HitTypes.ENTITY) {
            this.onEntityHit(hitResult as EntityHitResult);
        } else if (hitResult.getType() === HitTypes.BLOCK) {
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

    public onIntercept(_damage: number): void {
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
        this.velocityDirty = true;
    }

    protected override getMapOffsetX(): number {
        return 80;
    }

    protected override getMapOffsetY(): number {
        return 80;
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
            nbt.putString('owner', this.ownerUuid);
        }
        nbt.putFloat('damage', this.damage);
        nbt.putUint32Array('colors', [encodeColorHex(this.color), encodeColorHex(this.edgeColor)]);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);

        if (nbt.contains('owner', NbtTypeId.String)) {
            const ownerUuid = nbt.getString('owner');
            if (UUIDUtil.isValidUUID(ownerUuid)) {
                this.ownerUuid = ownerUuid;
            }
        }

        if (nbt.contains('damage', NbtTypeId.Number)) {
            this.damage = nbt.getFloat('damage');
        }

        if (nbt.contains('colors', NbtTypeId.Uint32Array)) {
            const colors = nbt.getUint32Array('colors');
            if (colors[0]) {
                this.color = decodeColorToHex(colors[0]);
            }
            if (colors[1]) {
                this.edgeColor = decodeColorToHex(colors[1]);
            }
        }
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected isOwner(entity: Entity) {
        return entity.getUUID() === this.ownerUuid;
    }

    protected defineSyncedData(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}