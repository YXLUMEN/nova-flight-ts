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
import type {UUID} from "../../apis/types.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";
import {decodeColorToHex, encodeColorHex} from "../../utils/NetUtil.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable, IColorEntity {
    private damage: number = 0;
    public color: string = "#8cf5ff";
    public edgeColor: string = '';
    private ownerUuid: UUID | null = null;
    private owner: Entity | null = null;
    private wrapTime = 0;

    protected constructor(type: EntityType<ProjectileEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world);

        this.damage = damage;
        this.setOwner(owner);
    }

    public override tick() {
        super.tick();

        const pos = this.getPositionRef;
        this.moveByVec(this.getVelocityRef);
        if (pos.y < -20 || pos.y > World.WORLD_H + 20 || pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
        }
    }

    protected override calculateBoundingBox() {
        const box = super.calculateBoundingBox();
        const v = this.getVelocityRef;
        if (v.lengthSquared() < 1124) {
            return box;
        }

        return box.expand(Math.abs(v.x) * 0.1, Math.abs(v.y) * 0.1);
    }

    public abstract onEntityHit(entity: Entity): void;

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
        nbt.putUint32Array('colors', encodeColorHex(this.color), encodeColorHex(this.edgeColor));
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

        if (nbt.contains('damage', NbtTypeId.Float)) {
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

    protected wrapPosition(): boolean {
        const pos = this.getPositionRef;
        const W = World.WORLD_W;

        if (this.wrapTime > 4 || pos.y < -20 || pos.y > World.WORLD_H + 20) {
            this.discard();
            return false;
        }
        if (pos.x < 0 || pos.x > World.WORLD_W) this.wrapTime++;

        this.setPosition(((pos.x % W) + W) % W, pos.y);
        return true;
    }

    protected initDataTracker(_builder: InstanceType<typeof DataTracker.Builder>): void {
    }
}