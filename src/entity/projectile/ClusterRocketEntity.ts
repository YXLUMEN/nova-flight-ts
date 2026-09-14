import {EntityTypes} from "../EntityTypes.ts";
import {FuseRocketEntity} from "./FuseRocketEntity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {HALF_PI, randInt} from "../../utils/math/math.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {Entity} from "../Entity.ts";
import {ExplosionConfigs} from "../../world/element/explosion/ExplosionConfigs.ts";
import type {RocketEntity} from "./RocketEntity.ts";
import {ExplosiveBuilder} from "../../world/element/explosion/ExplosiveBuilder.ts";

export class ClusterRocketEntity extends FuseRocketEntity {
    private static readonly CLUSTER_BEHAVIOUR = new ExplosiveBuilder()
        .sound(SoundEvents.BLAST)
        .build();

    private readonly rocketCounts = 12;

    public constructor(
        type: EntityType<RocketEntity>,
        world: World,
        owner: Entity | null,
        damage?: number,
        health?: number,
        behaviour?: ExplosionConfigs,
        fuse: number = 20,
    ) {
        super(type, world, owner, damage, health, behaviour ?? ClusterRocketEntity.CLUSTER_BEHAVIOUR, fuse);
    }

    public override explode() {
        super.explode();

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        const yaw = this.getYaw();
        const pos = this.positionRef;
        const configs = this.behaviour ?? ClusterRocketEntity.CLUSTER_BEHAVIOUR;

        for (let i = this.rocketCounts; i--;) {
            const rocket = new FuseRocketEntity(
                EntityTypes.ROCKET_ENTITY,
                world,
                this.getOwner(),
                8,
                undefined,
                configs,
                randInt(8, 30),
            );
            rocket.explosionDamage = this.explosionDamage;

            const angleOffset = -HALF_PI + (Math.PI / (this.rocketCounts - 1)) * i;
            const bulletYaw = yaw + angleOffset;

            const dirX = Math.cos(bulletYaw);
            const dirY = Math.sin(bulletYaw);

            rocket.setPosition(
                pos.x + dirX * 10,
                pos.y + dirY * 10
            );
            rocket.setVelocity(dirX * 20, dirY * 20);

            rocket.setYaw(bulletYaw);
            world.spawnEntity(rocket);
        }
    }

    protected override changeColor() {
        this.color.color = '#ff5d2a';
    }
}