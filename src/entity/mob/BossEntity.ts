import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import {clamp, PI2, rand} from "../../utils/math/math.ts";
import {BulletEntity} from "../projectile/BulletEntity.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import type {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {EVENTS} from "../../apis/IEvents.ts";

export class BossEntity extends MobEntity {
    public static exist: BossEntity | null = null;
    public color = '#b30000';
    protected override speed = 0;

    private cooldown = 0;
    private damageCooldown: number = 0;

    public constructor(type: EntityType<BossEntity>, world: World, worth: number) {
        if (BossEntity.exist) return BossEntity.exist;
        super(type, world, worth);
        BossEntity.exist = this;
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 160);
    }

    public override tick(dt: number) {
        super.tick(dt);

        if (this.damageCooldown > 0) this.damageCooldown -= 1;
        this.cooldown -= 1;
        if (this.cooldown > 0) return;
        this.cooldown = rand(10, 100);

        const count = 16;
        const speed = 4;
        const startAngle = 0.4537722; // 26
        const endAngle = 2.6859825; // 154
        const step = (endAngle - startAngle) / (count - 1);

        const world = this.getWorld();
        const pos = this.getMutPos.clone();
        for (let i = count; i--;) {
            const angle = startAngle + step * i;
            const vel = new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const b = new BulletEntity(EntityTypes.BULLET_ENTITY, world, this, 1);
            b.setVelocity(vel);
            b.setPosByVec(pos);
            b.color = '#ff0000'
            world.spawnEntity(b);
        }
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.damageCooldown > 0) return false;

        damage = clamp((damage * 0.1) | 0, 1, 4);
        if (super.takeDamage(damageSource, damage)) {
            this.damageCooldown = 16;
            return true;
        }
        return false;
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);

        const world = this.getWorld();
        world.events.emit(EVENTS.BOSS_KILLED, {mob: this, damageSource});

        for (let i = 32; i--;) {
            const a = rand(0, PI2);
            const speed = rand(240, 360);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            world.spawnParticle(
                this.getMutPos, vel, rand(0.8, 1.4), rand(12, 24),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public override discard() {
        super.discard();
        BossEntity.exist = null;
    }

    public override addStatusEffect(_effect: StatusEffectInstance) {
        return false;
    }

    public override attack(player: PlayerEntity) {
        player.getWorld().gameOver();
        this.discard();
    }
}