import {Entity} from "./Entity.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import {BehaviourEnum, ExplosionBehavior} from "../world/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../world/explosion/ExplosionVisual.ts";
import {FilterBehaviour} from "../world/explosion/FilterBehaviour.ts";

export class ExplosionEntity extends Entity {
    public override noClip = true;

    public readonly invulnerable = true;
    public readonly countdown: number;
    public readonly behavior: ExplosionBehavior;
    public readonly visual: ExplosionVisual;

    public constructor(type: EntityType<ExplosionEntity>, world: World, countdown: number = 60, behavior?: ExplosionBehavior, visual?: ExplosionVisual) {
        super(type, world);

        this.countdown = countdown;
        this.behavior = behavior ?? new FilterBehaviour(BehaviourEnum.ONLY_DAMAGE, undefined, false, false)
            .withFiler(entity => entity.isPlayer());
        this.visual = visual ?? new ExplosionVisual(128);
    }

    public override tick() {
        super.tick();

        if (this.age < this.countdown || this.isRemoved()) return;
        this.discard();

        const world = this.getWorld();
        if (world.isClient) return;

        const source = world.getDamageSources().explosion(this, this);
        world.createExplosion(this, source, this.getX(), this.getY(), 16, this.behavior, this.visual);
    }

    public override canHitByProjectile(): boolean {
        return false;
    }

    public override shouldSave(): boolean {
        return false;
    }

    public onDataTrackerUpdate(): void {
    }

    public onTrackedDataSet(): void {
    }

    protected initDataTracker(): void {
    }
}