import {LivingEntity} from "../LivingEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {World} from "../../world/World.ts";
import {PI2, rand} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {EntityType} from "../EntityType.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export abstract class MobEntity extends LivingEntity {
    protected t = Math.random();
    private readonly worth: number;

    protected constructor(type: EntityType<MobEntity>, world: World, worth: number) {
        super(type, world);
        this.worth = worth;
    }

    public override tick(tickDelta: number): void {
        super.tick(tickDelta);

        this.t += tickDelta;
        const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        this.getMutPos.y += this.speed * speedMultiplier;
        this.getMutPos.x += Math.sin(this.t * 2) * 40 * tickDelta * speedMultiplier;

        if (this.getMutPos.y > World.H + 40) this.discard();
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const result = super.takeDamage(damageSource, damage);
        if (!result) return false;

        const world = this.getWorld();
        world.events.emit(EVENTS.MOB_DAMAGE, {mob: this, damageSource});
        world.spawnParticle(this.getMutPos, MutVec2.zero(), rand(0.2, 0.6), rand(4, 6),
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
                this.getMutPos, vel, rand(0.6, 0.8), rand(4, 6),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public attack(player: PlayerEntity) {
        const world = this.getWorld();
        player.takeDamage(world.getDamageSources().mobAttack(this), 1);
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