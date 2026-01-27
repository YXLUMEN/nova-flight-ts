import {Entity} from "./Entity.ts";
import type {EntityType} from "./EntityType.ts";
import {World} from "../world/World.ts";
import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";

export class ExplosionEntity extends Entity {
    public readonly invulnerable = true;
    public readonly countdown: number;
    public readonly opt: ExplosionOpts;

    public constructor(type: EntityType<ExplosionEntity>, world: World, countdown: number = 60, opt?: ExplosionOpts) {
        super(type, world);

        this.countdown = countdown;
        this.opt = {
            explosionRadius: 128,
            damage: 16,
            playSound: false,
            ...opt
        };
    }

    public override tick() {
        super.tick();

        if (this.age < this.countdown || this.isRemoved()) return;
        this.discard();

        const world = this.getWorld();
        if (world.isClient) return;

        const source = world.getDamageSources().explosion(this, this);
        world.createExplosion(this, source, this.getX(), this.getY(), this.opt);
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