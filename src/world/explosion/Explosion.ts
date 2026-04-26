import {MutVec2} from "../../utils/math/MutVec2.ts";
import {PI2, rand, squareDist, squareDistVec2} from "../../utils/math/math.ts";
import type {ClientWorld} from "../../client/ClientWorld.ts";
import type {World} from "../World.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {ProjectileEntity} from "../../entity/projectile/ProjectileEntity.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {BatchBlockChangesPacket} from "../../network/packet/BatchBlockChangesPacket.ts";
import {ServerCommonHandler} from "../../server/network/handler/ServerCommonHandler.ts";
import type {BlockChange} from "../map/BlockChange.ts";
import {BlockCollision} from "../collision/BlockCollision.ts";
import {BehaviourEnum, EffectEnum, ExplosionBehavior} from "./ExplosionBehavior.ts";
import {ExplosionVisual} from "./ExplosionVisual.ts";
import {AABB} from "../../utils/math/AABB.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";

export class Explosion {
    public static readonly DEFAULT_BEHAVIOUR = new ExplosionBehavior();
    public static readonly DEFAULT_VISUAL = new ExplosionVisual();

    private readonly world: World;
    private readonly x: number;
    private readonly y: number;

    private readonly source: Entity | null;
    private readonly power: number;
    private readonly damageSource: DamageSource;

    private readonly behaviour: ExplosionBehavior;
    private readonly visual: ExplosionVisual;

    public constructor(
        world: World,
        source: Entity | null,
        damageSource: DamageSource | null,
        x: number,
        y: number,
        power: number,
        behaviour: ExplosionBehavior | null,
        visual: ExplosionVisual | null
    ) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.power = power;
        this.source = source;
        this.damageSource = damageSource === null ? world.getDamageSources().explosionInstance(this) : damageSource;
        this.behaviour = behaviour === null ? Explosion.DEFAULT_BEHAVIOUR : behaviour;
        this.visual = visual === null ? Explosion.DEFAULT_VISUAL : visual;
    }

    public apply() {
        this.world.isClient ?
            this.summonExplosionVisual(this.world as ClientWorld) :
            this.applyExplosion();
    }

    public applyExplosion() {
        if (this.power === 0) return;

        const behavior = this.behaviour.behaviour;
        if (behavior === BehaviourEnum.EITHER) return;

        if (behavior === BehaviourEnum.BOTH ||
            behavior === BehaviourEnum.ONLY_DESTROY) {
            this.destroyBlock();
        }
        if (behavior === BehaviourEnum.BOTH ||
            behavior === BehaviourEnum.ONLY_DAMAGE) {
            if (this.behaviour.decay) this.damageEntities();
            else this.damageEntitiesInRange();
        }
    }

    private damageEntitiesInRange() {
        const radiusSq = this.visual.radius * this.visual.radius;
        const source = this.source instanceof ProjectileEntity ? this.source.getOwner() : this.source;

        const box = AABB.fromCenter(this.x, this.y, this.visual.radius, this.visual.radius);
        const entities = this.world.searchOtherEntities(
            source,
            box,
            entity => this.behaviour.canDamage(entity)
        );

        const halfR2 = this.behaviour.effect === EffectEnum.FUSION ? Math.floor(this.visual.radius / 2) ** 2 : 0;
        for (const entity of entities) {
            const dist = squareDist(entity.getX(), entity.getY(), this.x, this.y);
            if (dist > radiusSq) continue;

            entity.takeDamage(this.damageSource, this.power);
            if (this.behaviour.statusEffect && entity instanceof LivingEntity) {
                entity.addEffect(this.behaviour.statusEffect, source);
            }

            if (halfR2 > 0 && halfR2 >= dist) {
                this.fusion(entity, this.power);
            }
        }
    }

    private damageEntities() {
        // power * 2 * 8
        // 系数 * 方块大小
        const radius = this.power * 16;
        const box = new AABB(
            Math.floor(this.x - radius - 1),
            Math.floor(this.y - radius - 1),
            Math.floor(this.x + radius + 1),
            Math.floor(this.y + radius + 1),
        );

        const source = this.source instanceof ProjectileEntity ? this.source.getOwner() : this.source;

        const candidates = this.world.searchOtherEntities(
            source,
            box,
            entity => !entity.isImmuneToExplosion() && this.behaviour.canDamage(entity)
        );
        const start = new Vec2(this.x, this.y);

        const halfR2 = this.behaviour.effect === EffectEnum.FUSION ? Math.floor(this.visual.radius / 2) ** 2 : 0;
        for (const entity of candidates) {
            const box = entity.getBoundingBox();
            const pos = entity.positionRef;
            const entityHit = box.containsVec(start) ? pos : box.raycast(start, pos);
            if (!entityHit) continue;

            const blockHit = this.world.raycast(start, pos);
            if (!blockHit.missed && squareDistVec2(blockHit.pos, start) < squareDistVec2(entityHit, start)) {
                continue;
            }

            entity.takeDamage(this.damageSource, this.power);
            if (this.behaviour.statusEffect && entity instanceof LivingEntity) {
                entity.addEffect(this.behaviour.statusEffect, source);
            }

            if (halfR2 > 0 && halfR2 >= squareDistVec2(start, pos)) {
                this.fusion(entity, this.power);
            }
        }
    }

    private destroyBlock() {
        const map = this.world.getMap();

        const rayCount = 32;
        const changes: BlockChange[] = [];
        const start = new Vec2(this.x, this.y);

        const baseRadius = this.power * 8;

        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * PI2;
            const radius = baseRadius * (0.8 + Math.random() * 0.4); // 0.8-1.2

            const end = new Vec2(
                this.x + Math.cos(angle) * radius,
                this.y + Math.sin(angle) * radius
            );

            const power = this.power * (0.9 + Math.random() * 0.2); // 0.9-1.1
            BlockCollision.raycast(
                start,
                end,
                {map, centerX: this.x, centerY: this.y, changes, power},
                (ctx, pos) => {
                    const x = pos.getX();
                    const y = pos.getY();

                    ctx.power -= 0.225;
                    if (ctx.power <= 0.1) return true;
                    if (ctx.map.get(x, y) === 0) return null;

                    ctx.power -= 0.5;
                    ctx.map.set(x, y, 0);
                    ctx.changes.push({type: 0, x, y});
                    return null;
                },
                () => null
            );
        }

        if (changes.length === 0) return;
        const channel = this.world.getNetworkChannel();
        ServerCommonHandler.buildBatchWithEst(changes, () => 9, BatchBlockChangesPacket.from)
            .forEach(packet => channel.send(packet));
    }

    private fusion(entity: Entity, damage: number) {
        if (!(entity instanceof LivingEntity)) return;

        const final = damage + (entity.getHealth() * 0.3) | 0;
        entity.takeDamage(this.damageSource, final);
    }

    public summonExplosionVisual(world: ClientWorld) {
        const sparks = this.visual.sparks;
        const fastSparks = this.visual.fastSparks;

        const important = this.visual.important;
        for (let i = 0; i < sparks; i++) {
            const a = rand(0, PI2);
            const speed = rand(120, 360);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);
            const ePos = new MutVec2(this.x, this.y);

            if (important) {
                world.addImportantParticle(ePos.x, ePos.y, vel.x, vel.y,
                    rand(0.25, 0.6), rand(3, 8),
                    "#ffd966", "rgba(255,69,0,0)")
            } else {
                world.addParticleByVec(
                    ePos, vel, rand(0.25, 0.6), rand(3, 8),
                    "#ffd966", "rgba(255,69,0,0)");
            }
        }

        for (let i = 0; i < fastSparks; i++) {
            const a = rand(0, PI2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);
            const ePos = new MutVec2(this.x, this.y);

            if (important) {
                world.addImportantParticle(ePos.x, ePos.y, vel.x, vel.y,
                    rand(0.6, 1.2), rand(4, 10),
                    "#ffaa33", "rgba(255,140,0,0)", 0.6
                );
            } else {
                world.addParticleByVec(
                    ePos, vel, rand(0.6, 1.2), rand(4, 10),
                    "#ffaa33", "rgba(255,140,0,0)", 0.6
                );
            }
        }

        import('../../effect/RadialRing.ts')
            .then(mod => {
                const vec = new Vec2(this.x, this.y);

                world.addEffect(null, new mod.RadialRing(
                    vec,
                    this.visual.radius * 0.2, this.visual.radius * 1.1,
                    0.35, this.visual.color
                ));
                if (this.behaviour.effect !== EffectEnum.FUSION) return;
                const r = this.visual.radius / 2;
                world.addEffect(null, new mod.RadialRing(
                    vec,
                    r * 0.1, r * 1.1,
                    0.8, '#e13600'
                ));
            });

        if (this.behaviour.playSound) world.playSound(null, SoundEvents.EXPLOSION);
    }

    public getX() {
        return this.x;
    }

    public getY() {
        return this.y;
    }

    public getSource(): Entity | null {
        return this.source;
    }

    public getCausingEntity(): Entity | null {
        return Explosion.getCausingEntity(this.source);
    }

    public getDamageSource() {
        return this.damageSource;
    }

    public getPower() {
        return this.power;
    }

    public getBehaviour() {
        return this.behaviour;
    }

    public getVisual() {
        return this.visual;
    }

    private static getCausingEntity(from: Entity | null): Entity | null {
        if (from === null) {
            return null;
        }

        if (from instanceof LivingEntity) {
            return from;
        }

        if (from instanceof ProjectileEntity) {
            return from.getOwner();
        }
        return null;
    }
}