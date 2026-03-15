import {ExplodeBulletEntity} from "../../../entity/projectile/ExplodeBulletEntity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import {Techs} from "../../../tech/Techs.ts";
import {EffectEnum, ExplosionBehavior} from "../../../world/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../../../world/explosion/ExplosionVisual.ts";

export class Cannon90 extends BaseWeapon {
    private readonly speed = 16;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const fusion = attacker instanceof PlayerEntity && attacker.getTechs().isUnlocked(Techs.FUSION_BOMB);

        const bullet = new ExplodeBulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world,
            attacker,
            stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1),
            stack.getOrDefault(DataComponents.EXPLOSION_POWER, 5),
            new ExplosionBehavior(undefined, fusion ? EffectEnum.FUSION : EffectEnum.NONE),
            new ExplosionVisual(stack.getOrDefault(DataComponents.EXPLOSION_RADIUS, 16), undefined, 4, 2)
        );

        this.setBullet(bullet, attacker, this.speed, 20, 1);
        world.spawnEntity(bullet);
        world.playSound(null, SoundEvents.CANNON90_FIRE);
    }

    public override getDisplayName(): string {
        return "90mm机炮";
    }

    public override getUiColor(): string {
        return "#ffcb6a";
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }

    protected override getMuzzleParticles(): number {
        return 8;
    }
}