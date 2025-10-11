import {Entity} from "../Entity.ts";
import {World} from "../../world/World.ts";
import type {IOwnable} from "../IOwnable.ts";
import type {EntityType} from "../EntityType.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {type NbtCompound} from "../../nbt/NbtCompound.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {IColorEntity} from "../IColorEntity.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {UUID} from "../../apis/registry.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable, IColorEntity {
    public readonly damage: number;
    public color = "#8cf5ff";
    public edgeColor = '';
    private ownerUuid: UUID | null = null;
    private owner: Entity | null = null;
    private wrapTime = 0;

    public constructor(type: EntityType<ProjectileEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world);

        this.damage = damage;
        this.setOwner(owner);
    }

    public override tick() {
        super.tick();

        const pos = this.getPositionRef;
        this.moveByVec(this.getVelocityRef);

        if (this.shouldWrap()) {
            this.wrapPosition();
            return;
        }

        if (pos.y < -20 || pos.y > World.WORLD_H + 20 || pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
        }
    }

    public abstract onEntityHit(entity: Entity): void;

    public setOwner(entity: Entity | null): void {
        if (entity) {
            this.ownerUuid = entity.getUuid();
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

    public override shouldWrap(): boolean {
        return this.getOwner()?.shouldWrap() ?? false;
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        if (this.ownerUuid) {
            nbt.putString('Owner', this.ownerUuid);
        }
        nbt.putString('Color', this.color);
        nbt.putString('EdgeColor', this.edgeColor);

        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        const ownerUuid = nbt.getString('Owner') as UUID;
        this.ownerUuid = ownerUuid.length > 0 ? ownerUuid : null;
        this.color = nbt.getString('Color');
        this.edgeColor = nbt.getString('EdgeColor');
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected isOwner(entity: Entity) {
        return entity.getUuid() === this.ownerUuid;
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