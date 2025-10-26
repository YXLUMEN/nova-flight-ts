import {LivingEntity} from "../LivingEntity.ts";
import {World} from "../../world/World.ts";
import {clamp, rand} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {MobAI} from "../ai/MobAI.ts";
import type {NbtCompound} from "../../nbt/NbtCompound.ts";
import type {IColorEntity} from "../IColorEntity.ts";
import type {DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export abstract class MobEntity extends LivingEntity implements IColorEntity {
    public color = '#ff6b6b';
    public yStep = 1;

    private worth: number;
    private AI: MobAI;

    protected constructor(type: EntityType<MobEntity>, world: World, worth: number = 1) {
        super(type, world);
        this.worth = worth;
        this.age += (Math.random() * 10) | 0;
        this.setYaw(1.57079);

        this.AI = new MobAI(this.getId());
    }

    public override tick(): void {
        super.tick();

        this.AI.action(this);
        this.moveByVec(this.getVelocityRef);
        this.adjustPosition();
    }

    public getAi() {
        return this.AI;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const result = super.takeDamage(damageSource, damage);
        if (!result) return false;

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return true;

        world.events.emit(EVENTS.MOB_DAMAGE, {mob: this, damageSource});
        world.spawnParticleVec(
            this.getPositionRef, 1, 1, 1, rand(20, 60),
            rand(0.2, 0.6), rand(4, 6),
            "#ffaa33", "#ff5454"
        );
        return true;
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        world.events.emit(EVENTS.MOB_KILLED, {mob: this, damageSource, pos: this.getPositionRef});

        world.spawnParticle(
            this.getPositionRef.x, this.getPositionRef.y,
            1, 1, 4, rand(80, 100),
            rand(0.6, 0.8), rand(4, 6),
            "#ffaa33", "#ff5454"
        );
    }

    public attack(player: PlayerEntity) {
        const world = this.getWorld();
        const result = player.takeDamage(
            world.getDamageSources().mobAttack(this), this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE));

        if (result) {
            this.onDeath(world.getDamageSources().playerImpact(player));
        }
    }

    public getWorth(): number {
        return this.worth;
    }

    public override createSpawnPacket(): EntitySpawnS2CPacket {
        return EntitySpawnS2CPacket.create(this, this.worth);
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        super.onSpawnPacket(packet);
        const worth = packet.entityData;
        if (worth > 0) this.worth = worth;
        this.AI.setSeed(this.getId());
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.putUint('Worth', this.worth);
        nbt.putString('Color', this.color);
        nbt.putByte('AiBehavior', this.AI.getBehavior());
        nbt.putUint('Age', this.age);

        return nbt;
    }

    public override readNBT(nbt: NbtCompound): void {
        super.readNBT(nbt);
        this.worth = nbt.getUint('Worth', 1);
        this.color = nbt.getString('Color', this.color);
        this.AI.setBehavior(this, nbt.getByte('AiBehavior', 0));
        this.age = nbt.getUint('Age', 0);
    }

    public isRangedAttacker(): boolean {
        return false;
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    protected override adjustPosition(): boolean {
        const pos = this.getPositionRef;
        if (pos.y > World.WORLD_H + 40) {
            this.discard();
            return false;
        }

        this.setPosition(clamp(pos.x, 20, World.WORLD_W), Math.max(pos.y, 0));
        return true;
    }
}