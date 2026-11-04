import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {C125BulletEntity} from "../../../entity/projectile/C125BulletEntity.ts";
import {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import {Techs} from "../../../world/tech/Techs.ts";
import {ExplosionConfigs, ExplosionTag} from "../../../world/element/explosion/ExplosionConfigs.ts";
import {ExplosionVisual} from "../../../world/element/explosion/ExplosionVisual.ts";

export class Artillery125 extends BaseWeapon {
    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const fusion = attacker instanceof PlayerEntity && attacker.getTechs().isUnlocked(Techs.FUSION_BOMB);

        const bullet = new C125BulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world,
            attacker,
            stack.getOr(DataComponents.ATTACK_DAMAGE, 1),
            stack.getOr(DataComponents.EXPLOSION_POWER, 5),
            new ExplosionConfigs(undefined, fusion ? ExplosionTag.FUSION : ExplosionTag.NONE),
            new ExplosionVisual(stack.getOr(DataComponents.EXPLOSION_RADIUS, 16), undefined, 6, 3));

        this.setBulletByStack(bullet, attacker, stack, 20);
        world.spawnEntity(bullet);
        world.playSound(null, SoundEvents.CANNON125_FIRE, 0.3);
    }

    public override getUiColor(): string {
        return '#c18505';
    }

    protected override getMuzzleParticles(): number {
        return 12;
    }
}