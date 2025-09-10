import {LivingEntity} from "../LivingEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {World} from "../../world/World.ts";
import {clamp, PI2, rand} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {EntityType} from "../EntityType.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export abstract class MobEntity extends LivingEntity {
    protected ticks = Math.random() * 10;
    private readonly worth: number;

    protected constructor(type: EntityType<MobEntity>, world: World, worth: number) {
        super(type, world);
        this.worth = worth;
    }

    public override tick(): void {
        super.tick();

        this.ticks++;
        const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        const speed = this.getMovementSpeed() * speedMultiplier;
        const swingValue = Math.sin(this.ticks * 0.1) * 0.5 * speedMultiplier

        this.updateVelocity(speed, swingValue, 1);
        this.moveByVec(this.getVelocity());

        const pos = this.getPositionRef;
        pos.x = clamp(pos.x, 20, World.W);

        if (pos.y > World.H + 40) this.discard();
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const result = super.takeDamage(damageSource, damage);
        if (!result) return false;

        const world = this.getWorld();
        world.events.emit(EVENTS.MOB_DAMAGE, {mob: this, damageSource});
        world.spawnParticle(this.getPositionRef, MutVec2.zero(), rand(0.2, 0.6), rand(4, 6),
            "#ffaa33", "#ff5454", 0.6, 80);
        return true;
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld();
        world.events.emit(EVENTS.MOB_KILLED, {mob: this, damageSource});

        for (let i = 0; i < 4; i++) {
            const a = rand(0, PI2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            world.spawnParticle(
                this.getPositionRef, vel, rand(0.6, 0.8), rand(4, 6),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public attack(player: PlayerEntity) {
        const world = this.getWorld();
        player.takeDamage(world.getDamageSources().mobAttack(this), this.getAttributeValue(EntityAttributes.GENERIC_ATTACK_DAMAGE));
        this.onDeath(world.getDamageSources().playerImpact(player));
    }

    public getWorth(): number {
        return this.worth;
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}