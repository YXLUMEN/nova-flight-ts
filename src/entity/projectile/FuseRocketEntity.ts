import {RocketEntity} from "./RocketEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {Entity} from "../Entity.ts";
import {ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";

export class FuseRocketEntity extends RocketEntity {
    private fuse: number;
    public playSound = true;

    public constructor(
        type: EntityType<RocketEntity>,
        world: World,
        owner: Entity | null,
        damage: number = 8,
        fuse: number = 20,
        behaviour?: ExplosionBehavior
    ) {
        super(type, world, owner, damage, 6, behaviour);
        this.fuse = fuse;
    }

    public override tick() {
        super.tick();
        if (this.fuse-- === 0) {
            this.explode();
            this.discard();
        }
    }

    public override explode() {
        this.getWorld().createExplosion(this, null,
            this.getX(), this.getY(), this.explosionDamage,
            new ExplosionBehavior(this.behaviour?.behaviour, this.behaviour?.effect, this.behaviour?.decay, this.playSound),
            new ExplosionVisual(this.explosionRadius, this.explodeColor, 5, 2)
        );
    }
}