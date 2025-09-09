import {ProjectileEntity} from "./ProjectileEntity.ts";
import {type Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {PI2, rand} from "../../utils/math/math.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class MissileEntity extends ProjectileEntity {
    private ticks = 0;
    private target: Entity | null = null;

    private readonly lockDelayTicks = 40;
    private readonly maxLifetimeTicks = 1000;
    private readonly driftSpeed = 1;
    private readonly moveSpeed = 8;
    private readonly turnRate = Math.PI / 45;

    private readonly driftAngle: number;

    public constructor(type: EntityType<MissileEntity>, world: World, owner: LivingEntity, yaw: number, driftAngle: number) {
        super(type, world, owner, 5);
        this.driftAngle = driftAngle;
        this.setYaw(yaw);
    }

    public override tick() {
        const pos = this.getMutPosition;
        pos.addVec(this.getVelocity());

        if (pos.y < -100 || pos.y > World.H + 100 || pos.x < -100 || pos.x > World.W + 100) {
            this.discard();
            return;
        }

        this.ticks++;

        if (this.ticks > this.maxLifetimeTicks) {
            this.discard();
            return;
        }

        if (this.ticks < this.lockDelayTicks) {
            this.setVelocity(
                Math.cos(this.driftAngle) * this.driftSpeed,
                Math.sin(this.driftAngle) * this.driftSpeed);
            return;
        }

        if (this.ticks % 4 === 0) {
            this.getWorld().spawnParticle(this.getMutPosition, Vec2.ZERO, rand(1, 1.5), rand(4, 6),
                "#986900", "#575757", 0.6, 80);
        }

        // 追踪阶段
        if (!this.target || this.target.isRemoved()) {
            this.target = this.acquireTarget();
            if (!this.target) {
                const yaw = this.getYaw();
                const vx = Math.cos(yaw) * this.moveSpeed;
                const vy = Math.sin(yaw) * this.moveSpeed;
                this.setVelocity(vx, vy);
                return;
            }
        }

        // 平滑转向
        const targetPos = this.target.getMutPosition;
        const dx = targetPos.x - pos.x;
        const dy = targetPos.y - pos.y;
        const desiredYaw = Math.atan2(dy, dx);

        let deltaYaw = desiredYaw - this.getYaw();
        deltaYaw = ((deltaYaw + Math.PI) % PI2) - Math.PI;

        // 限制转向速率
        if (deltaYaw > this.turnRate) deltaYaw = this.turnRate;
        if (deltaYaw < -this.turnRate) deltaYaw = -this.turnRate;

        this.setYaw(this.getYaw() + deltaYaw);

        // 推进
        const vx = Math.cos(this.getYaw()) * this.moveSpeed;
        const vy = Math.sin(this.getYaw()) * this.moveSpeed;
        this.setVelocity(vx, vy);
    }

    private acquireTarget(): Entity | null {
        const world = this.getWorld();
        const mobs = world.getLoadMobs();
        if (mobs.size === 0) return null;

        let nearest: Entity | null = null;
        let nearestDist2 = Infinity;
        const pos = this.getMutPosition;

        for (const mob of mobs) {
            if (mob.isRemoved() || mob === this.owner) continue;
            const mobPos = mob.getMutPosition;
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
        this.getWorld().events.emit(EVENTS.BOMB_DETONATE, {
            source: this,
            damage: 10,
            attacker,
            pos: this.getMutPosition,
            explosionRadius: 64,
            fastSparks: 2,
            sparks: 5
        });
    }
}