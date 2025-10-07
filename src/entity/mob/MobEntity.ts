import {LivingEntity} from "../LivingEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {World} from "../../world/World.ts";
import {clamp, rand} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {EntityType} from "../EntityType.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {MobAI} from "../ai/MobAI.ts";
import type {NbtCompound} from "../../nbt/NbtCompound.ts";
import type {IColorEntity} from "../IColorEntity.ts";

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
        this.AI = new MobAI(this);
    }

    public override tick(): void {
        super.tick();

        this.AI.action(this);
        this.moveByVec(this.getVelocityRef);
        this.getVelocityRef.multiply(0.8);
        this.adjustPosition();
    }

    public setBehavior(behavior: number): void {
        this.AI.setBehavior(behavior);
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

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const result = super.takeDamage(damageSource, damage);
        if (!result) return false;

        const world = this.getWorld();
        world.events.emit(EVENTS.MOB_DAMAGE, {mob: this, damageSource});

        world.addParticleByVec(
            this.getPositionRef.clone(), MutVec2.zero(),
            rand(0.2, 0.6), rand(4, 6),
            "#ffaa33", "#ff5454",
            0.6, 80
        );
        return true;
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld();
        world.events.emit(EVENTS.MOB_KILLED, {mob: this, damageSource});
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

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.putUint('Worth', this.worth);
        nbt.putString('Color', this.color);
        nbt.putInt8('AiBehavior', this.AI.getBehavior());
        nbt.putUint('Age', this.age);

        return nbt;
    }

    public override readNBT(nbt: NbtCompound): void {
        super.readNBT(nbt);
        this.worth = nbt.getUint('Worth', 1);
        this.color = nbt.getString('Color', this.color);
        this.AI.setBehavior(nbt.getInt8('AiBehavior', 0));
        this.age = nbt.getUint('Age', 0);
    }

    public isRangedAttacker(): boolean {
        return false;
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}