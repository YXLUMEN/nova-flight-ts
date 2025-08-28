import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../World.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MiniBulletEntity} from "../projectile/MiniBulletEntity.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";

export class GunEnemyEntity extends MobEntity {
    public override speed = 80;
    public color = "#ff6b6b";

    private cooldown = 0;
    private readonly interval = 3 * WorldConfig.tick;

    private static readonly bulletVel = new Vec2(0, 200);

    public constructor(type: EntityType<MobEntity>, world: World) {
        super(type, world, 2, 5);
    }

    public override tick(dt: number) {
        super.tick(dt);

        this.cooldown -= 1;
        if (this.cooldown > 0) return;
        this.cooldown = this.interval;
        const world = this.getWorld();

        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMCStatus)) return;

        const b = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this, 1);
        b.setVelocity(GunEnemyEntity.bulletVel);
        b.setPosByVec(this.getMutPos);

        b.color = '#ff0000'
        world.spawnEntity(b);
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.getMutPos.x, this.getMutPos.y, 20, 20);
        ctx.restore();
    }
}