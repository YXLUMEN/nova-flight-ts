import {LivingEntity} from "../LivingEntity.ts";
import {World} from "../../world/World.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import type {EntityAi} from "../ai/EntityAi.ts";
import {MobAI} from "../ai/MobAI.ts";
import {MobKilled} from "../../event/events/entity/MobKilled.ts";
import {MobDamage} from "../../event/events/entity/MobDamage.ts";

export abstract class MobEntity extends LivingEntity {
    public verticalMovementDir = 1;

    protected readonly AI: EntityAi;
    private worth: number;

    protected constructor(type: EntityType<MobEntity>, world: World, worth: number = 1) {
        super(type, world);
        this.worth = worth;
        this.age += (Math.random() * 10) | 0;
        this.setYaw(1.57079);

        this.AI = this.createAi();
    }

    public override tick(): void {
        super.tick();

        this.move(this.velocityRef);
        this.clampPosition();
    }

    protected override tickAi() {
        if (this.stuckTicks === 0) {
            this.AI.decision();
        }
        this.AI.tick();
    }

    protected createAi(): EntityAi {
        return new MobAI(this);
    }

    public getAi(): EntityAi {
        return this.AI;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const result = super.takeDamage(damageSource, damage);
        if (!result) return false;

        this.getWorld().events.emit(new MobDamage(this, damage, damageSource));
        return true;
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        world.events.emit(new MobKilled(this, damageSource));
        world.spawnPreparedParticle(ParticleEffects.ENTITY_DEATH, this.positionRef, 4);
    }

    public attack(player: PlayerEntity) {
        player.takeDamage(
            this.getWorld().getDamageSources().mobAttack(this),
            this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE)
        );
    }

    public getWorth(): number {
        return this.worth;
    }

    public override canMoveVoluntarily(): boolean {
        return super.canMoveVoluntarily() && !this.AI.isDisabled();
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        super.onSpawnPacket(packet);
        this.AI.setSeed(this.getId());
    }

    public isRangedAttacker(): boolean {
        return false;
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    protected override adjustBlockCollision(movement: MutVec2): MutVec2 {
        const map = this.getWorld().getMap();
        const bounds = this.getBoundingBox();

        if (map.intersectsBox(bounds)) {
            if (this.stuckTicks === 0) this.ejectCooldown = 0;
            this.stuckTicks++;

            if (this.ejectCooldown <= 0) {
                const eject = BlockCollision.findEjectionVector(map, this.positionRef, bounds, 24);
                if (eject) {
                    this.stuckTicks = 0;
                    this.ejectCooldown = 0;
                    return movement.set(eject.x, eject.y);
                }
                this.ejectCooldown = Math.min(1 << Math.min(this.stuckTicks - 1, 12), 32);
            } else this.ejectCooldown--;

            return movement.multiply(0);
        }
        this.stuckTicks = 0;

        return BlockCollision.separatingCollision(map, bounds, movement);
    }

    protected override getMapOffsetY(): number {
        return this.AI.isSimple() ? 200 : 0;
    }

    protected override onOutOfBounds(x: number, y: number) {
        if (y !== this.getY() && this.AI.isSimple()) {
            this.discard();
            return;
        }
        super.onOutOfBounds(x, y);
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);

        nbt.setUint32('worth', this.worth);
        nbt.setUint32('color', this.color.hex);
        nbt.setUint32('age', this.age);
        this.AI.writeNBT(nbt);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound): void {
        super.readNBT(nbt);

        this.worth = nbt.getUint32('worth', this.worth);
        if (nbt.contains('color', NbtTypeId.Uint32)) {
            this.color.hex = nbt.getUint32('color');
        }
        this.age = nbt.getUint32('age', 0);
        this.AI.readNBT(nbt);
    }

    protected override changeColor() {
        this.color.color = '#ff6b6b';
    }
}