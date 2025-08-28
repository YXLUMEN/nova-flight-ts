import {StatusEffects} from "../effect/StatusEffects.ts";
import {MiniBulletEntity} from "../projectile/MiniBulletEntity.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {MobEntity} from "./MobEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";

export class MiniGunEnemyEntity extends MobEntity {
    public color = "#ac0000";
    public override speed = 60;
    private cooldown = 0;
    private fireCount = 0;
    private fireCD = 0;

    private static readonly bulletVel = new Vec2(0, 240);

    public constructor(type: EntityType<MiniGunEnemyEntity>, world: World) {
        super(type, world, 64, 10);
    }

    public override tick(dt: number) {
        super.tick(dt);

        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        this.fireCD--;
        if (this.fireCD > 0) return;
        this.fireCD = 10;

        if (this.fireCount > 16) {
            this.cooldown = 300;
            this.fireCount = 0;
            return;
        }

        const world = this.getWorld();
        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMCStatus)) return;

        const pos = this.getMutPos;
        const b = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this, 1);
        b.setVelocity(MiniGunEnemyEntity.bulletVel);
        b.setPos(pos.x + this.getEntityWidth() / 2, pos.y + this.getEntityHeight());

        b.color = '#ff0000'
        world.spawnEntity(b);
        this.fireCount++;
    }
}