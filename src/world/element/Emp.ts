import type {WorldMutation} from "./WorldMutation.ts";
import {Entity} from "../../entity/Entity.ts";
import type {World} from "../World.ts";
import {AABB} from "../../utils/math/AABB.ts";
import {EntityPredicates} from "../predicate/EntityPredicates.ts";
import {ProjectileEntity} from "../../entity/projectile/ProjectileEntity.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class Emp implements WorldMutation {
    private readonly attacker: Entity | null;
    private readonly x: number;
    private readonly y: number;
    private readonly radius: number;
    private readonly duration: number;
    private readonly damage: number;

    public constructor(
        attacker: Entity | null,
        x: number, y: number,
        radius: number,
        duration: number = 40,
        damage: number = 0,
    ) {
        this.attacker = attacker;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.duration = duration;
        this.damage = damage;
    }

    public static create(
        attacker: Entity | null,
        pos: Vec2,
        radius: number,
        duration?: number,
        damage?: number,
    ) {
        return new Emp(
            attacker,
            pos.x, pos.y,
            radius,
            duration,
            damage
        );
    }

    public apply(world: World) {
        const box = AABB.fromCenter(this.x, this.y, this.radius, this.radius);
        const search = world.searchOtherEntities(
            this.attacker,
            box,
            EntityPredicates.inRange(this.x, this.y, this.radius)
        );

        const source = world.getDamageSources().arc(this.attacker);
        for (const entity of search) {
            if (entity instanceof ProjectileEntity) {
                if (entity.getOwner() !== this.attacker) entity.discard();
                continue;
            }
            if (entity instanceof LivingEntity) {
                entity.addEffect(new StatusEffectInstance(StatusEffects.EMC_STATUS, this.duration, 1), this.attacker);
                entity.takeDamage(source, this.damage);
            }
        }

        world.playSound(this.attacker, SoundEvents.EMP_BURST);
        if (!world.isClient) {
            import('../../effect/EMPBurst.ts')
                .then(mod => {
                    (world as ServerWorld).spawnVisual(null, new mod.EMPBurst(new Vec2(this.x, this.y), this.radius));
                })
        }
    }
}