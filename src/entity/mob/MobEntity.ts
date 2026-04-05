import {LivingEntity} from "../LivingEntity.ts";
import {World} from "../../world/World.ts";
import {rand} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {EVENTS} from "../../type/IEvents.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {AiBehavior, MobAI} from "../ai/MobAI.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {IColorEntity} from "../IColorEntity.ts";
import type {DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {decodeColorToHex, encodeColorHex} from "../../utils/NetUtil.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";

export abstract class MobEntity extends LivingEntity implements IColorEntity {
    public color = '#ff6b6b';
    public verticalMovementDir = 1;

    private worth: number;
    private readonly AI: MobAI;

    protected constructor(type: EntityType<MobEntity>, world: World, worth: number = 1) {
        super(type, world);
        this.worth = worth;
        this.age += (Math.random() * 10) | 0;
        this.setYaw(1.57079);

        this.AI = new MobAI(this.getId());
    }

    public override tick(): void {
        super.tick();

        if (!this.isClient() && this.stuckTicks === 0) {
            this.AI.updateAction(this);
        }

        this.move(this.getVelocityRef);
        this.clampPosition();
    }

    protected override tickAi() {
        this.AI.tickAi(this);
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
        if (this.getShieldAmount() > 0) {
            world.spawnParticleVec(
                this.getPositionRef, 1, 1, 1, rand(10, 30),
                rand(0.2, 0.6), rand(4, 6),
                "#5095ff", "#73c4ff"
            );
            return true;
        }

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
        player.takeDamage(
            this.getWorld().getDamageSources().mobAttack(this),
            this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE)
        );
    }

    public getWorth(): number {
        return this.worth;
    }

    public override createSpawnPacket(): EntitySpawnS2CPacket {
        return EntitySpawnS2CPacket.create(this, this.worth);
    }

    public override canMoveVoluntarily(): boolean {
        return super.canMoveVoluntarily() && !this.AI.disable;
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        super.onSpawnPacket(packet);
        const worth = packet.entityData;
        if (worth > 0) this.worth = worth;
        this.AI.setSeed(this.getId());
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);

        nbt.putUint32('worth', this.worth);
        nbt.putUint32('color', encodeColorHex(this.color));
        nbt.putInt8('ai_behavior', this.AI.getBehavior());
        nbt.putUint32('age', this.age);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound): void {
        super.readNBT(nbt);

        this.worth = nbt.getUint32('worth', this.worth);
        if (nbt.contains('color', NbtTypeId.Uint32)) {
            this.color = decodeColorToHex(nbt.getUint32('color'));
        }
        this.AI.setBehavior(nbt.getInt8('ai_behavior', 3));
        this.age = nbt.getUint32('age', 0);
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
                const eject = BlockCollision.findEjectionVector(map, this.getPositionRef, bounds, 24);
                if (eject) {
                    this.stuckTicks = 0;
                    this.ejectCooldown = 0;
                    return movement.set(eject.x, eject.y);
                }
                this.ejectCooldown = Math.min(1 << Math.min(this.stuckTicks - 1, 5), 32);
            } else this.ejectCooldown--;

            return movement.multiply(0);
        }
        this.stuckTicks = 0;

        return BlockCollision.separatingCollision(map, bounds, movement);
    }

    protected override getMapOffsetY(): number {
        return this.AI.getBehavior() === AiBehavior.Simple ? 80 : 0;
    }

    protected override onOutOfBounds(x: number, y: number) {
        if (y !== this.getY() && this.AI.isSimple()) {
            this.discard();
            return;
        }
        super.onOutOfBounds(x, y);
    }
}