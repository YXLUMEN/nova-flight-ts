import {ExplodeBulletEntity} from "../../../entity/projectile/ExplodeBulletEntity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import {Techs} from "../../../world/tech/Techs.ts";
import {ExplosionConfigs, ExplosionTag} from "../../../world/element/explosion/ExplosionConfigs.ts";
import {ExplosionVisual} from "../../../world/element/explosion/ExplosionVisual.ts";

export class Cannon90 extends BaseWeapon {
    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const fusion = attacker instanceof PlayerEntity && attacker.getTechs().isUnlocked(Techs.FUSION_BOMB);

        const bullet = new ExplodeBulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world,
            attacker,
            stack.getOr(DataComponents.ATTACK_DAMAGE, 1),
            stack.getOr(DataComponents.EXPLOSION_POWER, 5),
            new ExplosionConfigs(undefined, fusion ? ExplosionTag.FUSION : ExplosionTag.NONE),
            new ExplosionVisual(stack.getOr(DataComponents.EXPLOSION_RADIUS, 16), undefined, 8, 6)
        );

        this.setBulletByStack(bullet, attacker, stack, 20);
        world.spawnEntity(bullet);
        world.playSound(null, SoundEvents.CANNON90_FIRE);
    }

    public override getUiColor(): string {
        return "#ffcb6a";
    }

    protected override getMuzzleParticles(): number {
        return 8;
    }
}