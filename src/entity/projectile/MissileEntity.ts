import {ProjectileEntity} from "./ProjectileEntity.ts";
import {type Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {rand} from "../../utils/math/math.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {EVENTS} from "../../apis/IEvents.ts";

export class MissileEntity extends ProjectileEntity {
    private ticks = 0;
    private target: Entity | null = null;

    private readonly lockDelayTicks = 40;
    private readonly maxLifetimeTicks = 1000;
    private readonly driftSpeed = 1;
    private readonly moveSpeed = 8;
    private readonly turnRate = Math.PI / 30;

    private readonly driftAngle: number;

    public constructor(type: EntityType<MissileEntity>, world: World, owner: LivingEntity, yaw: number, driftAngle: number) {
        super(type, world, owner, 5);
        this.driftAngle = driftAngle;
        this.setYaw(yaw);
    }

    public override tick() {
        const pos = this.getPositionRef;
        pos.addVec(this.getVelocity());

        if (pos.y < -400 || pos.y > World.H + 400 || pos.x < -400 || pos.x > World.W + 400) {
            this.discard();
            return;
        }

        if (this.ticks++ > this.maxLifetimeTicks) {
            this.discard();
            return;
        }

        if (this.ticks < this.lockDelayTicks) {
            const vx1 = Math.cos(this.driftAngle);
            const vy1 = Math.sin(this.driftAngle);
            this.updateVelocity(this.driftSpeed, vx1, vy1);
            return;
        }

        if ((this.ticks & 3) === 0) {
            this.getWorld().spawnParticle(this.getPositionRef, Vec2.ZERO,
                rand(1, 1.5), rand(4, 6),
                "#986900", "#575757", 0.6, 80
            );
        }

        // 追踪阶段
        if (!this.target || this.target.isRemoved()) {
            this.target = this.acquireTarget();
            if (!this.target) {
                const yaw = this.getYaw();
                const vx2 = Math.cos(yaw);
                const vy2 = Math.sin(yaw);
                this.updateVelocity(this.moveSpeed, vx2, vy2);
                return;
            }
        }

        const targetPos = this.target.getPositionRef;
        const dx = targetPos.x - pos.x;
        const dy = targetPos.y - pos.y;
        const desiredYaw = Math.atan2(dy, dx);

        this.setClampYaw(desiredYaw, this.turnRate);

        const vx3 = Math.cos(this.getYaw());
        const vy3 = Math.sin(this.getYaw());
        this.updateVelocity(this.moveSpeed, vx3, vy3);
    }

    private acquireTarget(): Entity | null {
        const mobs = this.getWorld().getLoadMobs();
        if (mobs.size === 0) return null;

        const pos = this.getPositionRef;
        let nearest: Entity | null = null;
        let nearestDist2 = Infinity;

        for (const mob of mobs) {
            if (mob.isRemoved() || mob === this.owner) continue;
            const mobPos = mob.getPositionRef;
            const dx = mobPos.x - pos.x;
            const dy = mobPos.y - pos.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < nearestDist2) {
                nearestDist2 = dist2;
                nearest = mob;
            }
        }
        return nearest;
    }

    public onEntityHit(entity: Entity): void {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        const attacker = this.owner instanceof LivingEntity ? this.owner : null;
        entity.takeDamage(sources.mobProjectile(this, attacker), this.damage);
    }

    public override discard(): void {
        super.discard();

        const attacker = this.owner instanceof LivingEntity ? this.owner : null;
        this.getWorld().events.emit(EVENTS.BOMB_DETONATE, {
            source: this,
            damage: 10,
            attacker,
            pos: this.getPositionRef,
            explosionRadius: 64,
            fastSparks: 2,
            sparks: 5
        });
    }
}