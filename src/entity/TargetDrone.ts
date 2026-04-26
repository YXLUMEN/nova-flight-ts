import {MobEntity} from "./mob/MobEntity.ts";
import {type DamageSource} from "./damage/DamageSource.ts";
import {DamageTypes} from "./damage/DamageTypes.ts";
import type {EntityType} from "./EntityType.ts";
import type {World} from "../world/World.ts";
import {EntityAttributes} from "./attribute/EntityAttributes.ts";
import type {EntityAi} from "./ai/EntityAi.ts";
import {EmptyAi} from "./ai/EmptyAi.ts";

export class TargetDrone extends MobEntity {
    private static readonly MAX_CD = 20;

    public readonly damage: string[] = [];

    private clearTime = 0;
    private currentCd = TargetDrone.MAX_CD;
    private clearCd = 0;

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
            return;
        }

        if (this.clearCd > 0) {
            this.clearCd--;
            return;
        }
        this.clearCd = this.currentCd;
        this.currentCd = Math.max(5, this.currentCd -= 5);

        this.damage.shift();
    }

    public push(damage: number) {
        this.damage.push(damage.toString());

        this.clearTime = 40;
        this.currentCd = TargetDrone.MAX_CD;

        if (this.damage.length > 7) this.damage.shift();
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