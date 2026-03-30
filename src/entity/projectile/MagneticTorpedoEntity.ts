import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {rand, wrapRadians} from "../../utils/math/math.ts";

export class MagneticTorpedoEntity extends ProjectileEntity {
    private static readonly hitEntities = new WeakMap<Entity, number>();

    private triggered: boolean = false;

    public hitEntity: Entity | null = null;
    public relativeYaw: number | null = null;
    public hitOffset: IVec | null = null;

    private countdown: number;
    private readonly power: number;

    public constructor(
        type: EntityType<MagneticTorpedoEntity>,
        world: World,
        owner: Entity | null,
        damage: number,
        power: number,
        countdown: number = 40,
    ) {
        super(type, world, owner, damage);
        this.power = power;
        this.countdown = countdown;
    }

    public override tick() {
        // 未命中
        if (!this.triggered) {
            super.tick();
            this.getWorld().addParticle(
                this.prevX, this.prevY,
                0, 0,
                0.5, 2,
                '#fffce9', '#bcbcbc'
            );
            return;
        }

        // 倒计时
        if (this.countdown === 0) {
            this.explode();
            return;
        }
        this.countdown--;

        if (!this.hitOffset) {
            const pos = this.getPositionRef;
            const velocity = this.getVelocityRef;
            this.setPosition(pos.x + velocity.x, pos.y + velocity.y);
            return;
        }

        // 命中方块
        if (!this.hitEntity) {
            this.setPositionByVec(this.hitOffset);
            return;
        }

        // 目标失效
        if (this.hitEntity.isRemoved()) {
            MagneticTorpedoEntity.hitEntities.delete(this.hitEntity);
            this.hitEntity = null;
            this.hitOffset = null;
            this.setVelocity(rand(-1, 1), rand(-1, 1));
            return;
        }

        // 吸附目标
        const targetPos = this.hitEntity.getPositionRef;
        this.setPositionByVec(targetPos);
    }

    protected override onEntityHit(hitResult: EntityHitResult): void {
        this.triggered = true;
        this.hitEntity = hitResult.entity;
        this.hitEntity.takeDamage(
            this.getWorld().getDamageSources().projectile(this, this.getOwner()),
            this.getHitDamage()
        );
        this.relativeYaw = wrapRadians(this.getYaw() - this.hitEntity.getYaw());

        const targetPos = this.hitEntity.getPositionRef;
        const targetYaw = this.hitEntity.getYaw();
        const collisionPos = hitResult.pos.equals(targetPos) ? this.getPositionRef : hitResult.pos;

        const offsetX = collisionPos.x - targetPos.x;
        const offsetY = collisionPos.y - targetPos.y;

        const cos = Math.cos(-targetYaw);
        const sin = Math.sin(-targetYaw);

        const localOffsetX = offsetX * cos - offsetY * sin;
        const localOffsetY = offsetX * sin + offsetY * cos;

        this.hitOffset = new Vec2(localOffsetX, localOffsetY);
        this.setVelocity(0, 0);

        const count = MagneticTorpedoEntity.hitEntities.get(this.hitEntity) ?? 0;
        MagneticTorpedoEntity.hitEntities.set(this.hitEntity, count + 1);

        if (this.isClient()) return;
        (this.getWorld() as ServerWorld).spawnParticle(
            collisionPos.x, collisionPos.y, 1, 1,
            6, 24, 1, 3, '#a8cbff'
        );
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        this.triggered = true;
        this.hitOffset = hitResult.pos;
        this.setVelocity(0, 0);

        if (this.isClient()) return;
        (this.getWorld() as ServerWorld).spawnParticle(
            hitResult.pos.x, hitResult.pos.y, 1, 1,
            6, 24, 1, 3, '#a8cbff'
        );
    }

    private explode(): void {
        let power = this.power;
        if (this.hitEntity) {
            const count = MagneticTorpedoEntity.hitEntities.get(this.hitEntity) ?? 0;
            if (count === 0) MagneticTorpedoEntity.hitEntities.delete(this.hitEntity);
            else MagneticTorpedoEntity.hitEntities.set(this.hitEntity, count - 1);

            power += count * 0.8;
        }

        if (this.isClient()) {
            this.discard();
            return;
        }

        const offset = this.hitEntity && this.hitOffset ?
            MagneticTorpedoEntity.getExploreOffset(this.hitEntity.getPositionRef, this.hitEntity.getYaw(), this.hitOffset) :
            this.getPositionRef;
        this.getWorld().createExplosion(
            this,
            null,
            offset.x, offset.y,
            power
        );
        this.discard();
    }

    protected override onDiscard() {
        super.onDiscard();
        this.hitEntity = null;
        this.hitOffset = null;
    }

    public getCountDown(): number {
        return this.countdown;
    }

    public static getExploreOffset(targetPos: IVec, targetYaw: number, hitOffset: IVec) {
        const cos = Math.cos(targetYaw);
        const sin = Math.sin(targetYaw);

        const worldOffsetX = hitOffset.x * cos - hitOffset.y * sin;
        const worldOffsetY = hitOffset.x * sin + hitOffset.y * cos;
        return new Vec2(targetPos.x + worldOffsetX, targetPos.y + worldOffsetY);
    }
}