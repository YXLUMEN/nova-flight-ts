import {MobEntity} from "./mob/MobEntity.ts";
import {type DamageSource} from "./damage/DamageSource.ts";
import {DamageTypes} from "./damage/DamageTypes.ts";
import type {EntityType} from "./EntityType.ts";
import type {World} from "../world/World.ts";
import {EntityAttributes} from "./attribute/EntityAttributes.ts";
import type {EntityAi} from "./ai/EntityAi.ts";
import {EmptyAi} from "./ai/EmptyAi.ts";

export class TargetDrone extends MobEntity {
    public dps = '';

    private ticks = 0;
    private acc = 0;
    private clearTime = 0;
    private dirty = true;

    public constructor(type: EntityType<TargetDrone>, world: World) {
        super(type, world, 0);
        this.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(100);
        this.setHealth(this.getMaxHealth());
    }

    protected override createAi(): EntityAi {
        return EmptyAi.INSTANCE;
    }

    public override tick() {
        this.tickStatusEffects();
        this.velocityRef.set(0, 0);

        if (this.clearTime > 0) {
            this.clearTime--;
            this.ticks++;

            if (!this.dirty) return;
            this.dps = this.ticks > 0
                ? `${(this.acc / this.ticks).toFixed(1)}/t`
                : '0.0/t';

            this.dirty = false;
            return;
        }

        this.acc = 0;
        this.dps = '';
        this.ticks = 0;
    }

    public push(damage: number): void {
        this.clearTime = 40;
        this.acc += damage;
        this.dirty = true;
    }

    public override onDeath(damageSource: DamageSource) {
        if (damageSource.isOf(DamageTypes.KILL) || damageSource.isOf(DamageTypes.REMOVED)) {
            super.onDeath(damageSource);
            return;
        }
        this.setHealth(this.getMaxHealth());
    }

    public override attack() {
    }
}